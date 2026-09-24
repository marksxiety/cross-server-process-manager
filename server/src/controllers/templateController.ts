import type { Request, Response } from 'express';
import db from '../config/db';
import { fail, ok } from '../utils/response';

export type TemplateDataType = 'string' | 'boolean' | 'number' | 'array' | 'object';

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
             WHERE ($1::boolean OR t.is_active = TRUE)
             ORDER BY t.category, t.template_name, k.id`,
            [withInactive]
        )

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
            if (template) {
                if (row.property_key !== null) {
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
        }

        ok(res, 'Templates retrieved successfully', [...templates.values()]);
    } catch (error) {
        console.error(error);
        fail(res, 500, 'Failed to retrieve templates', 'INTERNAL_SERVER_ERROR');
    }
}