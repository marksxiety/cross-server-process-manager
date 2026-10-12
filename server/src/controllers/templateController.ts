import type { Request, Response } from 'express';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import db from '../config/db';
import { templateInputSchema, templateValuesInputSchema } from '../schemas/templateSchema';
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
const CHECK_VIOLATION_CODE = '23514';
const DUPLICATE_KEY_CODE = '23505';
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
             WHERE ($1::boolean OR t.is_active = TRUE)
             ORDER BY c.cat_count DESC, t.category ASC, t.template_name ASC`,
            [withInactive]
        );

        const { rows: keyRows } = await db.query<TemplateKeyRow>(
            `SELECT ${KEY_COLUMNS}
             FROM template_keys
             WHERE template_id = ANY($1::int[])
             ORDER BY template_id, property_key`,
            [rows.map((row) => row.id)]
        );

        const valuesByTemplate = groupByTemplateId(keyRows);
        const templates = rows.map((row) => ({
            ...row,
            values: valuesByTemplate.get(row.id) ?? {},
        }));

        ok(res, 'Templates retrieved successfully', templates);
    } catch (error) {
        console.error(error);
        fail(res, 500, 'Failed to retrieve templates', 'INTERNAL_SERVER_ERROR');
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

    let client: PoolClient;
    try {
        client = await db.connect();
    } catch (error) {
        console.error(error);
        fail(res, 500, 'Failed to register template', 'INTERNAL_SERVER_ERROR');
        return;
    }

    try {
        await client.query('BEGIN');

        const { rows } = await client.query<{ id: number }>(
            `INSERT INTO templates (template_name, category, description, preview, is_active)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
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
            await client.query('ROLLBACK');
            fail(res, 500, 'Failed to register template', 'INTERNAL_SERVER_ERROR');
            return;
        }

        const keyInsert = buildKeyInsert(id, template.values);
        if (keyInsert) {
            await client.query(keyInsert.text, keyInsert.params);
        }

        await client.query('COMMIT');

        ok(res, 'Template registered successfully', { id, ...template });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        console.error(error);
        const dbError = error as {
            detail?: string;
            code?: string;
            constraint?: string;
            message?: string;
        };

        // template_name is the only unique column, so any 23505 is a name clash.
        if (dbError.code === DUPLICATE_KEY_CODE) {
            fail(res, 409, duplicateTemplateMessage(template.template_name), DUPLICATE_TEMPLATE_CODE);
            return;
        }

        if (dbError.code === CHECK_VIOLATION_CODE) {
            fail(res, 400, dbError.detail ?? 'Invalid template key payload', VALIDATION_FAILED_CODE);
            return;
        }

        fail(
            res,
            500,
            dbError.detail ?? dbError.message ?? 'Failed to register template',
            dbError.code ?? 'INTERNAL_SERVER_ERROR'
        );
    } finally {
        client.release();
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

    let client: PoolClient;
    try {
        client = await db.connect();
    } catch (error) {
        console.error(error);
        fail(res, 500, 'Failed to update template', 'INTERNAL_SERVER_ERROR');
        return;
    }

    try {
        await client.query('BEGIN');

        const { rowCount } = await client.query(
            'SELECT 1 FROM templates WHERE id = $1 FOR UPDATE',
            [id]
        );
        if (rowCount === 0) {
            await client.query('ROLLBACK');
            fail(res, 404, NOT_FOUND_MESSAGE, 'NOT_FOUND');
            return;
        }

        await client.query('DELETE FROM template_keys WHERE template_id = $1', [id]);

        const keyInsert = buildKeyInsert(id, values);
        if (keyInsert) {
            await client.query(keyInsert.text, keyInsert.params);
        }

        await client.query('UPDATE templates SET updated_at = current_timestamp WHERE id = $1', [
            id,
        ]);

        const { rows } = await client.query<TemplateSummary>(
            `SELECT ${TEMPLATE_COLUMNS} FROM templates WHERE id = $1`,
            [id]
        );

        const { rows: keyRows } = await client.query<TemplateKeyRow>(
            `SELECT ${KEY_COLUMNS} FROM template_keys WHERE template_id = $1 ORDER BY property_key`,
            [id]
        );

        await client.query('COMMIT');

        const template = rows[0];
        ok(
            res,
            'Template updated successfully',
            template ? { ...template, values: fromStoredValues(keyRows) } : null
        );
    } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        console.error(error);
        const dbError = error as {
            detail?: string;
            code?: string;
            constraint?: string;
            message?: string;
        };

        if (dbError.code === CHECK_VIOLATION_CODE) {
            fail(res, 400, dbError.detail ?? 'Invalid template key payload', VALIDATION_FAILED_CODE);
            return;
        }

        fail(
            res,
            500,
            dbError.detail ?? dbError.message ?? 'Failed to update template',
            dbError.code ?? 'INTERNAL_SERVER_ERROR'
        );
    } finally {
        client.release();
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
             WHERE id = $1
             RETURNING id, template_name, category, description, preview, is_active`,
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
        const dbError = error as { detail?: string; code?: string; message?: string };
        fail(
            res,
            500,
            dbError.detail ?? dbError.message ?? 'Failed to remove template',
            dbError.code ?? 'INTERNAL_SERVER_ERROR'
        );
    }
};
