import type { Request, Response } from 'express';
import { z } from 'zod';
import db, { type DbSession } from '../config/db';
import { templateInputSchema, templateValuesInputSchema } from '../schemas/templateSchema';
import { describeDbError, isCheckViolation, isUniqueViolation } from '../utils/dbError';
import { buildPlaceholders } from '../utils/sql';
import {
    buildKeyInsert,
    fromStoredValues,
    groupByTemplateId,
    normalizeValues,
    type TemplateKeyRow,
    type TemplateValues,
} from '../utils/templateValues';
import { fail, ok } from '../utils/response';

export interface TemplateRecord {
    id: number;
    template_name: string;
    category: string | null;
    description: string | null;
    preview: string | null;
    is_active: boolean;
    values: TemplateValues;
}

export type TemplateSummary = Omit<TemplateRecord, 'values'>;

const INVALID_ID_MESSAGE = 'Template id must be a positive integer';
const NOT_FOUND_MESSAGE = 'Template not found';
const VALIDATION_FAILED_CODE = 'VALIDATION_FAILED';
const INTERNAL_SERVER_ERROR_CODE = 'INTERNAL_SERVER_ERROR';
const DUPLICATE_TEMPLATE_CODE = 'DUPLICATE_TEMPLATE';

const TEMPLATE_COLUMNS = `id, template_name, category, description, preview, is_active`;
const KEY_COLUMNS = `template_id, property_key, property_value, data_type`;

function duplicateTemplateMessage(name: string): string {
    return `Template "${name}" is already registered`;
}

function parseIdParam(value: string | string[] | undefined): number | null {
    if (typeof value !== 'string') return null;
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

export const index = async (req: Request, res: Response): Promise<void> => {
    const withInactive = req.query.with_inactive === 'true';

    try {
        const { rows } = await db.query<TemplateSummary>(
            `SELECT t.id,
                    t.template_name,
                    t.category,
                    t.description,
                    t.preview,
                    t.is_active
             FROM templates t
             LEFT JOIN (
                 SELECT category, COUNT(id) AS cat_count
                 FROM templates
                 GROUP BY category
             ) c ON t.category = c.category
             WHERE (@p1 = 1 OR t.is_active = 1)
             ORDER BY c.cat_count DESC, t.category ASC, t.template_name ASC`,
            [withInactive]
        );

        let keyRows: TemplateKeyRow[] = [];
        if (rows.length > 0) {
            const result = await db.query<TemplateKeyRow>(
                `SELECT ${KEY_COLUMNS}
                 FROM template_keys
                 WHERE template_id IN (${buildPlaceholders(rows.length)})
                 ORDER BY template_id, property_key`,
                rows.map((row) => row.id)
            );
            keyRows = result.rows;
        }

        const valuesByTemplate = groupByTemplateId(keyRows);
        const templates = rows.map((row) => ({
            ...row,
            values: valuesByTemplate.get(row.id) ?? {},
        }));

        ok(res, 'Templates retrieved successfully', templates);
    } catch (error) {
        console.error(error);
        fail(res, 500, 'Failed to retrieve templates', INTERNAL_SERVER_ERROR_CODE);
    }
};

export const create = async (req: Request, res: Response): Promise<void> => {
    const parsed = templateInputSchema.safeParse(req.body);
    if (!parsed.success) {
        fail(
            res,
            400,
            'Invalid template payload',
            VALIDATION_FAILED_CODE,
            z.flattenError(parsed.error).fieldErrors
        );
        return;
    }

    const { template_name, category, description, preview, is_active, values } = parsed.data;
    const template = {
        template_name,
        category: category || null,
        description: description || null,
        preview: preview || null,
        is_active: is_active ?? true,
        values: normalizeValues(values as TemplateValues),
    };

    let session: DbSession;
    try {
        session = await db.beginTransaction();
    } catch (error) {
        console.error(error);
        fail(res, 500, 'Failed to register template', INTERNAL_SERVER_ERROR_CODE);
        return;
    }

    try {
        const { rows } = await session.query<{ id: number }>(
            `INSERT INTO templates (template_name, category, description, preview, is_active)
             OUTPUT INSERTED.id
             VALUES (@p1, @p2, @p3, @p4, @p5)`,
            [
                template.template_name,
                template.category,
                template.description,
                template.preview,
                template.is_active,
            ]
        );

        const id = rows[0]?.id;
        if (id === undefined) {
            await session.rollback().catch(() => undefined);
            fail(res, 500, 'Failed to register template', INTERNAL_SERVER_ERROR_CODE);
            return;
        }

        const keyInsert = buildKeyInsert(id, template.values);
        if (keyInsert) {
            await session.query(keyInsert.text, keyInsert.params);
        }

        await session.commit();

        ok(res, 'Template registered successfully', { id, ...template });
    } catch (error) {
        await session.rollback().catch(() => undefined);
        console.error(error);
        const dbError = describeDbError(error);

        // template_name is the only unique column, so any unique violation is a name clash.
        if (isUniqueViolation(dbError)) {
            fail(res, 409, duplicateTemplateMessage(template.template_name), DUPLICATE_TEMPLATE_CODE);
            return;
        }

        if (isCheckViolation(dbError)) {
            fail(res, 400, dbError.message, VALIDATION_FAILED_CODE);
            return;
        }

        fail(
            res,
            500,
            dbError.message || 'Failed to register template',
            dbError.number !== undefined ? String(dbError.number) : INTERNAL_SERVER_ERROR_CODE
        );
    }
};

export const update = async (req: Request, res: Response): Promise<void> => {
    const id = parseIdParam(req.params.id);
    if (id === null) {
        fail(res, 400, INVALID_ID_MESSAGE, 'INVALID_ID');
        return;
    }

    const parsed = templateValuesInputSchema.safeParse(req.body);
    if (!parsed.success) {
        fail(
            res,
            400,
            'Invalid template payload',
            VALIDATION_FAILED_CODE,
            z.flattenError(parsed.error).fieldErrors
        );
        return;
    }

    const { values } = parsed.data;

    let session: DbSession;
    try {
        session = await db.beginTransaction();
    } catch (error) {
        console.error(error);
        fail(res, 500, 'Failed to update template', INTERNAL_SERVER_ERROR_CODE);
        return;
    }

    try {
        const { rowCount } = await session.query(
            'SELECT 1 FROM templates WITH (UPDLOCK) WHERE id = @p1',
            [id]
        );
        if (rowCount === 0) {
            await session.rollback().catch(() => undefined);
            fail(res, 404, NOT_FOUND_MESSAGE, 'NOT_FOUND');
            return;
        }

        await session.query('DELETE FROM template_keys WHERE template_id = @p1', [id]);

        const keyInsert = buildKeyInsert(id, values);
        if (keyInsert) {
            await session.query(keyInsert.text, keyInsert.params);
        }

        await session.query(
            'UPDATE templates SET updated_at = SYSDATETIME() WHERE id = @p1',
            [id]
        );

        const { rows } = await session.query<TemplateSummary>(
            `SELECT ${TEMPLATE_COLUMNS} FROM templates WHERE id = @p1`,
            [id]
        );

        const { rows: keyRows } = await session.query<TemplateKeyRow>(
            `SELECT ${KEY_COLUMNS} FROM template_keys WHERE template_id = @p1 ORDER BY property_key`,
            [id]
        );

        await session.commit();

        const template = rows[0];
        ok(
            res,
            'Template updated successfully',
            template ? { ...template, values: fromStoredValues(keyRows) } : null
        );
    } catch (error) {
        await session.rollback().catch(() => undefined);
        console.error(error);
        const dbError = describeDbError(error);

        if (isCheckViolation(dbError)) {
            fail(res, 400, dbError.message, VALIDATION_FAILED_CODE);
            return;
        }

        fail(
            res,
            500,
            dbError.message || 'Failed to update template',
            dbError.number !== undefined ? String(dbError.number) : INTERNAL_SERVER_ERROR_CODE
        );
    }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
    const id = parseIdParam(req.params.id);
    if (id === null) {
        fail(res, 400, INVALID_ID_MESSAGE, 'INVALID_ID');
        return;
    }

    try {
        const { rows } = await db.query<TemplateSummary>(
            `DELETE FROM templates
             OUTPUT DELETED.id, DELETED.template_name, DELETED.category,
                    DELETED.description, DELETED.preview, DELETED.is_active
             WHERE id = @p1`,
            [id]
        );

        const removed = rows[0];
        if (!removed) {
            fail(res, 404, NOT_FOUND_MESSAGE, 'NOT_FOUND');
            return;
        }

        ok(res, 'Template removed successfully', removed);
    } catch (error) {
        console.error(error);
        const dbError = describeDbError(error);
        fail(
            res,
            500,
            dbError.message || 'Failed to remove template',
            dbError.number !== undefined ? String(dbError.number) : INTERNAL_SERVER_ERROR_CODE
        );
    }
};
