import db, { type DbSession } from '../Persistence/Connection';
import { buildPlaceholders } from '../Persistence/Sql';
import type { TemplateValues } from './TemplateKey';

export interface TemplateSummary {
    id: number;
    template_name: string;
    category: string | null;
    description: string | null;
    preview: string | null;
    is_active: boolean;
}

export interface TemplateRecord extends TemplateSummary {
    values: TemplateValues;
}

export interface TemplateData {
    template_name: string;
    category?: string | null | undefined;
    description?: string | null | undefined;
    preview?: string | null | undefined;
    is_active?: boolean | undefined;
    values: TemplateValues;
}

export interface TemplateAttributes {
    template_name: string;
    category: string | null;
    description: string | null;
    preview: string | null;
    is_active: boolean;
}

export interface TemplateUpsertAttributes {
    template_name: string;
    category: string;
    description: string;
    preview: string | null;
}

const TEMPLATE_COLUMNS = 'id, template_name, category, description, preview, is_active';

export class Template {
    static async all(withInactive: boolean): Promise<TemplateSummary[]> {
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
        return rows;
    }

    static async create(
        attributes: TemplateAttributes,
        session: DbSession
    ): Promise<number | undefined> {
        const { rows } = await session.query<{ id: number }>(
            `INSERT INTO templates (template_name, category, description, preview, is_active)
             OUTPUT INSERTED.id
             VALUES (@p1, @p2, @p3, @p4, @p5)`,
            [
                attributes.template_name,
                attributes.category,
                attributes.description,
                attributes.preview,
                attributes.is_active,
            ]
        );
        return rows[0]?.id;
    }

    static async lock(id: number, session: DbSession): Promise<boolean> {
        const { rowCount } = await session.query(
            'SELECT 1 FROM templates WITH (UPDLOCK) WHERE id = @p1',
            [id]
        );
        return rowCount > 0;
    }

    static async touch(id: number, session: DbSession): Promise<void> {
        await session.query('UPDATE templates SET updated_at = SYSDATETIME() WHERE id = @p1', [
            id,
        ]);
    }

    static async findSummary(
        id: number,
        session: DbSession
    ): Promise<TemplateSummary | undefined> {
        const { rows } = await session.query<TemplateSummary>(
            `SELECT ${TEMPLATE_COLUMNS} FROM templates WHERE id = @p1`,
            [id]
        );
        return rows[0];
    }

    static async delete(id: number): Promise<TemplateSummary | undefined> {
        const { rows } = await db.query<TemplateSummary>(
            `DELETE FROM templates
             OUTPUT DELETED.id, DELETED.template_name, DELETED.category,
                    DELETED.description, DELETED.preview, DELETED.is_active
             WHERE id = @p1`,
            [id]
        );
        return rows[0];
    }

    static async upsert(
        attributes: TemplateUpsertAttributes,
        session: DbSession
    ): Promise<number | undefined> {
        const { rows } = await session.query<{ id: number }>(
            `MERGE INTO templates AS target
             USING (SELECT @p1 AS template_name, @p2 AS category, @p3 AS description, @p4 AS preview) AS source
             ON target.template_name = source.template_name
             WHEN MATCHED THEN
                 UPDATE SET category = source.category,
                            description = source.description,
                            preview = source.preview,
                            updated_at = SYSDATETIME()
             WHEN NOT MATCHED THEN
                 INSERT (template_name, category, description, preview)
                 VALUES (source.template_name, source.category, source.description, source.preview)
             OUTPUT INSERTED.id;`,
            [attributes.template_name, attributes.category, attributes.description, attributes.preview]
        );
        return rows[0]?.id;
    }

    static async deleteExcept(names: string[], session: DbSession): Promise<void> {
        await session.query(
            `DELETE FROM templates WHERE template_name NOT IN (${buildPlaceholders(names.length)})`,
            names
        );
    }
}
