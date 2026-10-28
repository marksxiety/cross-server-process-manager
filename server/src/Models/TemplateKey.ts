import db, { type DbSession } from '../Persistence/Connection';
import { buildPlaceholders } from '../Persistence/Sql';

export type TemplateValues = Record<string, unknown>;

export type DataType = 'string' | 'boolean' | 'number' | 'array' | 'object';

export interface StoredValue {
    property_key: string;
    property_value: string | null;
    data_type: DataType;
}

export interface TemplateKeyRow extends StoredValue {
    template_id: number;
}

export interface KeyInsert {
    text: string;
    params: unknown[];
}

export interface TemplateValuesData {
    values: TemplateValues;
}

function toStoredValue(property_key: string, value: unknown): StoredValue {
    if (typeof value === 'number') {
        return { property_key, property_value: String(value), data_type: 'number' };
    }
    if (typeof value === 'boolean') {
        return { property_key, property_value: String(value), data_type: 'boolean' };
    }
    if (typeof value === 'string') {
        return { property_key, property_value: value, data_type: 'string' };
    }
    if (Array.isArray(value)) {
        return { property_key, property_value: JSON.stringify(value), data_type: 'array' };
    }
    if (typeof value === 'object') {
        return { property_key, property_value: JSON.stringify(value), data_type: 'object' };
    }
    throw new TypeError(`Template value "${property_key}" has an unsupported type`);
}

function fromStoredValue(row: StoredValue): unknown {
    switch (row.data_type) {
        case 'number':
            return row.property_value === null ? null : Number(row.property_value);
        case 'boolean':
            return row.property_value === 'true';
        case 'array':
        case 'object':
            return row.property_value === null ? null : JSON.parse(row.property_value);
        default:
            return row.property_value;
    }
}

export class TemplateKey {
    static toStoredValues(values: TemplateValues): StoredValue[] {
        return Object.entries(values)
            .filter(([, value]) => value !== null && value !== undefined)
            .map(([property_key, value]) => toStoredValue(property_key, value));
    }

    static fromStoredValues(rows: StoredValue[]): TemplateValues {
        const values: TemplateValues = {};
        for (const row of rows) {
            values[row.property_key] = fromStoredValue(row);
        }
        return values;
    }

    static normalize(values: TemplateValues): TemplateValues {
        return this.fromStoredValues(this.toStoredValues(values));
    }

    static groupByTemplateId(rows: TemplateKeyRow[]): Map<number, TemplateValues> {
        const grouped = new Map<number, TemplateValues>();
        for (const row of rows) {
            const values = grouped.get(row.template_id) ?? {};
            values[row.property_key] = fromStoredValue(row);
            grouped.set(row.template_id, values);
        }
        return grouped;
    }

    static buildInsert(templateId: number, values: TemplateValues): KeyInsert | null {
        const stored = this.toStoredValues(values);
        if (stored.length === 0) {
            return null;
        }

        const params: unknown[] = [];
        const tuples = stored.map((row) => {
            const base = params.length;
            params.push(templateId, row.property_key, row.property_value, row.data_type);
            return `(@p${base + 1}, @p${base + 2}, @p${base + 3}, @p${base + 4})`;
        });

        return {
            text: `INSERT INTO template_keys (template_id, property_key, property_value, data_type) VALUES ${tuples.join(', ')}`,
            params,
        };
    }

    static async forTemplateIds(ids: number[]): Promise<TemplateKeyRow[]> {
        if (ids.length === 0) {
            return [];
        }

        const { rows } = await db.query<TemplateKeyRow>(
            `SELECT template_id, property_key, property_value, data_type
             FROM template_keys
             WHERE template_id IN (${buildPlaceholders(ids.length)})
             ORDER BY template_id, property_key`,
            ids
        );
        return rows;
    }

    static async forTemplate(id: number, session: DbSession): Promise<TemplateKeyRow[]> {
        const { rows } = await session.query<TemplateKeyRow>(
            `SELECT template_id, property_key, property_value, data_type
             FROM template_keys
             WHERE template_id = @p1
             ORDER BY property_key`,
            [id]
        );
        return rows;
    }

    static async insertMany(
        templateId: number,
        values: TemplateValues,
        session: DbSession
    ): Promise<void> {
        const insert = this.buildInsert(templateId, values);
        if (insert) {
            await session.query(insert.text, insert.params);
        }
    }

    static async replaceAll(
        templateId: number,
        values: TemplateValues,
        session: DbSession
    ): Promise<void> {
        await session.query('DELETE FROM template_keys WHERE template_id = @p1', [templateId]);
        await this.insertMany(templateId, values, session);
    }
}
