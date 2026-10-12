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

/**
 * Converts a sparse values object into template_keys rows. Null and undefined
 * entries are dropped: an absent key means the form field starts empty.
 */
export function toStoredValues(values: TemplateValues): StoredValue[] {
    return Object.entries(values)
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([property_key, value]) => toStoredValue(property_key, value));
}

export function fromStoredValues(rows: StoredValue[]): TemplateValues {
    const values: TemplateValues = {};
    for (const row of rows) {
        values[row.property_key] = fromStoredValue(row);
    }
    return values;
}

/**
 * Round-trips values through the storage representation, dropping entries
 * that cannot be persisted (null/undefined) so API responses match later
 * reads from template_keys.
 */
export function normalizeValues(values: TemplateValues): TemplateValues {
    return fromStoredValues(toStoredValues(values));
}

export function groupByTemplateId(rows: TemplateKeyRow[]): Map<number, TemplateValues> {
    const grouped = new Map<number, TemplateValues>();
    for (const row of rows) {
        const values = grouped.get(row.template_id) ?? {};
        values[row.property_key] = fromStoredValue(row);
        grouped.set(row.template_id, values);
    }
    return grouped;
}

/**
 * Builds a parameterized multi-row INSERT for a template's keys. Returns null
 * when there is nothing to insert, so callers can skip the statement.
 */
export function buildKeyInsert(templateId: number, values: TemplateValues): KeyInsert | null {
    const stored = toStoredValues(values);
    if (stored.length === 0) {
        return null;
    }

    const params: unknown[] = [];
    const tuples = stored.map((row) => {
        const base = params.length;
        params.push(templateId, row.property_key, row.property_value, row.data_type);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
    });

    return {
        text: `INSERT INTO template_keys (template_id, property_key, property_value, data_type) VALUES ${tuples.join(', ')}`,
        params,
    };
}
