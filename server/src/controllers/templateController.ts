import type { Request, Response } from 'express';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import db from '../config/db';
import { templateInputSchema, templateKeysInputSchema } from '../schemas/templateSchema';
import { fail, ok } from '../utils/response';

export type TemplateDataType = 'string' | 'boolean' | 'number' | 'array' | 'object';

const INVALID_ID_MESSAGE = 'Template id must be a positive integer';
const NOT_FOUND_MESSAGE = 'Template not found';
const VALIDATION_FAILED_CODE = 'VALIDATION_FAILED';
const CHECK_VIOLATION_CODE = '23514';
const DUPLICATE_KEY_CODE = '23505';
const DUPLICATE_TEMPLATE_CODE = 'DUPLICATE_TEMPLATE';

function duplicateTemplateMessage(name: string): string {
    return `Template "${name}" is already registered`;
}

export interface TemplateKeyRecord {
    property_key: string;
    property_value: string | null;
    data_type: TemplateDataType;
    is_required: boolean;
    is_hidden: boolean;
    is_locked: boolean;
}

export interface TemplateRecord {
    id: number;
    template_name: string;
    category: string | null;
    description: string | null;
    preview: string | null;
    is_active: boolean;
    keys: TemplateKeyRecord[];
}

export type TemplateSummary = Omit<TemplateRecord, 'keys'>;

interface Templates {
    id: number;
    template_name: string;
    category: string | null;
    description: string | null;
    preview: string | null;
    is_active: boolean;
    property_key: string | null;
    property_value: string | null;
    data_type: TemplateDataType | null;
    is_required: boolean | null;
    is_hidden: boolean | null;
    is_locked: boolean | null;
}

function parseIdParam(value: string | string[] | undefined): number | null {
    if (typeof value !== 'string') return null;
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// Collapses the flat LEFT JOIN rows (one per key) into templates with a nested
// `keys` array, preserving query order for both templates and keys.
function groupTemplateRows(rows: Templates[]): TemplateRecord[] {
    const templates = new Map<number, TemplateRecord>();

    for (const row of rows) {
        const templateId = row.id;
        if (!templates.has(templateId)) {
            templates.set(templateId, {
                id: templateId,
                template_name: row.template_name,
                category: row.category,
                description: row.description,
                preview: row.preview,
                is_active: row.is_active,
                keys: []
            });
        }

        const template = templates.get(templateId);
        if (template && row.property_key !== null) {
            template.keys.push({
                property_key: row.property_key,
                property_value: row.property_value,
                data_type: row.data_type ?? 'string',
                is_required: row.is_required ?? false,
                is_hidden: row.is_hidden ?? false,
                is_locked: row.is_locked ?? false
            });
        }
    }

    return [...templates.values()];
}

// Upserts a key by the (template_id, property_key) natural key. Shared by the
// register and update flows so both persist keys identically.
async function upsertTemplateKey(
    client: PoolClient,
    templateId: number,
    key: TemplateKeyRecord
): Promise<void> {
    await client.query(
        `INSERT INTO template_keys
           (template_id, property_key, property_value, data_type, is_required, is_hidden, is_locked)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (template_id, property_key) DO UPDATE
         SET property_value = EXCLUDED.property_value,
             data_type = EXCLUDED.data_type,
             is_required = EXCLUDED.is_required,
             is_hidden = EXCLUDED.is_hidden,
             is_locked = EXCLUDED.is_locked,
             updated_at = current_timestamp`,
        [
            templateId,
            key.property_key,
            key.property_value,
            key.data_type,
            key.is_required,
            key.is_hidden,
            key.is_locked
        ]
    );
}

export const index = async (req: Request, res: Response): Promise<void> => {
    const withInactive = req.query.with_inactive === 'true';

    try {

        const { rows } = await db.query<Templates>(
            `SELECT t.id,
                    t.template_name,
                    t.category,
                    t.description,
                    t.preview,
                    t.is_active,
                    k.property_key,
                    k.property_value,
                    k.data_type,
                    k.is_required,
                    k.is_hidden,
                    k.is_locked
             FROM templates t
             LEFT JOIN template_keys k ON k.template_id = t.id
             LEFT JOIN (
                 SELECT category, COUNT(id) AS cat_count
                 FROM templates
                 GROUP BY category
             ) c ON t.category = c.category
             WHERE ($1::boolean OR t.is_active = TRUE)
             ORDER BY c.cat_count DESC, t.category ASC, t.template_name ASC, k.id`,
            [withInactive]
        )

        ok(res, 'Templates retrieved successfully', groupTemplateRows(rows));
    } catch (error) {
        console.error(error);
        fail(res, 500, 'Failed to retrieve templates', 'INTERNAL_SERVER_ERROR');
    }
}

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

    const { template_name, category, description, preview, is_active, keys } = parsed.data;
    const template = {
        template_name,
        category: category || null,
        description: description || null,
        preview: preview || null,
        is_active: is_active ?? true
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
                template.is_active
            ]
        );

        const id = rows[0]?.id;
        if (id === undefined) {
            await client.query('ROLLBACK');
            fail(res, 500, 'Failed to register template', 'INTERNAL_SERVER_ERROR');
            return;
        }

        for (const key of keys) {
            await upsertTemplateKey(client, id, key);
        }

        await client.query('COMMIT');

        ok(res, 'Template registered successfully', { id, ...template, keys });
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
}

export const update = async (req: Request, res: Response): Promise<void> => {
    const id = parseIdParam(req.params.id);
    if (id === null) {
        fail(res, 400, INVALID_ID_MESSAGE, 'INVALID_ID');
        return;
    }

    const parsed = templateKeysInputSchema.safeParse(req.body);
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

    const { keys } = parsed.data;

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

        // Upsert by the (template_id, property_key) natural key, then prune any
        // stored keys that were dropped in the editor — all in one transaction.
        for (const key of keys) {
            await upsertTemplateKey(client, id, key);
        }

        await client.query(
            `DELETE FROM template_keys
             WHERE template_id = $1 AND NOT (property_key = ANY($2::text[]))`,
            [id, keys.map((key) => key.property_key)]
        );

        await client.query(
            'UPDATE templates SET updated_at = current_timestamp WHERE id = $1',
            [id]
        );

        const { rows } = await client.query<Templates>(
            `SELECT t.id,
                    t.template_name,
                    t.category,
                    t.description,
                    t.preview,
                    t.is_active,
                    k.property_key,
                    k.property_value,
                    k.data_type,
                    k.is_required,
                    k.is_hidden,
                    k.is_locked
             FROM templates t
             LEFT JOIN template_keys k ON k.template_id = t.id
             WHERE t.id = $1
             ORDER BY k.id`,
            [id]
        );

        await client.query('COMMIT');

        const templates = groupTemplateRows(rows);
        ok(res, 'Template updated successfully', templates[0] ?? null);
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
}

export const remove = async (req: Request, res: Response): Promise<void> => {
    const id = parseIdParam(req.params.id);
    if (id === null) {
        fail(res, 400, INVALID_ID_MESSAGE, 'INVALID_ID');
        return;
    }

    try {
        // template_keys.template_id references templates(id) ON DELETE CASCADE,
        // so the key rows are removed atomically with the template.
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