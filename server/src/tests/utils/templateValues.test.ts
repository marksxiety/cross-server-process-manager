import { describe, expect, it } from 'vitest';
import {
    buildKeyInsert,
    fromStoredValues,
    groupByTemplateId,
    normalizeValues,
    toStoredValues,
    type TemplateKeyRow,
} from '../../utils/templateValues';

const KEY_ROWS: TemplateKeyRow[] = [
    { template_id: 1, property_key: 'script', property_value: 'index.js', data_type: 'string' },
    { template_id: 1, property_key: 'instances', property_value: '1', data_type: 'number' },
    { template_id: 1, property_key: 'autorestart', property_value: 'true', data_type: 'boolean' },
    { template_id: 1, property_key: 'watch', property_value: 'false', data_type: 'boolean' },
    { template_id: 1, property_key: 'args', property_value: '["--port","3000"]', data_type: 'array' },
    {
        template_id: 1,
        property_key: 'env',
        property_value: '{"NODE_ENV":"production"}',
        data_type: 'object',
    },
];

describe('toStoredValues', () => {
    it('maps each JSON type to its data_type and stored representation', () => {
        const stored = toStoredValues({
            script: 'index.js',
            instances: 1,
            autorestart: true,
            watch: false,
            args: ['--port', '3000'],
            env: { NODE_ENV: 'production' },
        });

        expect(stored).toEqual([
            { property_key: 'script', property_value: 'index.js', data_type: 'string' },
            { property_key: 'instances', property_value: '1', data_type: 'number' },
            { property_key: 'autorestart', property_value: 'true', data_type: 'boolean' },
            { property_key: 'watch', property_value: 'false', data_type: 'boolean' },
            { property_key: 'args', property_value: '["--port","3000"]', data_type: 'array' },
            {
                property_key: 'env',
                property_value: '{"NODE_ENV":"production"}',
                data_type: 'object',
            },
        ]);
    });

    it('drops null and undefined entries', () => {
        const stored = toStoredValues({ script: 'index.js', missing: null, also_missing: undefined });

        expect(stored).toEqual([
            { property_key: 'script', property_value: 'index.js', data_type: 'string' },
        ]);
    });

    it('returns an empty list for no values', () => {
        expect(toStoredValues({})).toEqual([]);
    });
});

describe('fromStoredValues', () => {
    it('restores each value to its original JSON type', () => {
        expect(fromStoredValues(KEY_ROWS)).toEqual({
            script: 'index.js',
            instances: 1,
            autorestart: true,
            watch: false,
            args: ['--port', '3000'],
            env: { NODE_ENV: 'production' },
        });
    });

    it('round-trips values through storage and back', () => {
        const values = {
            script: 'app.py',
            instances: 2,
            autorestart: false,
            args: ['-u'],
            env: { PORT: '5000' },
        };
        const rows = toStoredValues(values).map((row) => ({ template_id: 1, ...row }));

        expect(fromStoredValues(rows)).toEqual(values);
    });

    it('keeps numeric-looking strings as strings', () => {
        const rows: TemplateKeyRow[] = [
            { template_id: 1, property_key: 'PORT', property_value: '3000', data_type: 'string' },
        ];

        expect(fromStoredValues(rows)).toEqual({ PORT: '3000' });
    });
});

describe('normalizeValues', () => {
    it('round-trips values and drops entries that cannot be stored', () => {
        expect(
            normalizeValues({
                script: 'index.js',
                instances: 2,
                autorestart: false,
                args: ['-u'],
                missing: null,
                also_missing: undefined,
            })
        ).toEqual({
            script: 'index.js',
            instances: 2,
            autorestart: false,
            args: ['-u'],
        });
    });
});

describe('groupByTemplateId', () => {
    it('buckets rows into one values object per template', () => {
        const rows: TemplateKeyRow[] = [
            { template_id: 1, property_key: 'script', property_value: 'index.js', data_type: 'string' },
            { template_id: 2, property_key: 'args', property_value: '["-u"]', data_type: 'array' },
            { template_id: 1, property_key: 'instances', property_value: '2', data_type: 'number' },
        ];

        const grouped = groupByTemplateId(rows);

        expect(grouped.size).toBe(2);
        expect(grouped.get(1)).toEqual({ script: 'index.js', instances: 2 });
        expect(grouped.get(2)).toEqual({ args: ['-u'] });
    });

    it('returns an empty map for no rows', () => {
        expect(groupByTemplateId([]).size).toBe(0);
    });
});

describe('buildKeyInsert', () => {
    it('builds a parameterized multi-row insert', () => {
        const insert = buildKeyInsert(7, { script: 'app.py', instances: 2 });

        expect(insert?.text).toBe(
            'INSERT INTO template_keys (template_id, property_key, property_value, data_type) ' +
                'VALUES (@p1, @p2, @p3, @p4), (@p5, @p6, @p7, @p8)'
        );
        expect(insert?.params).toEqual([
            7, 'script', 'app.py', 'string',
            7, 'instances', '2', 'number',
        ]);
    });

    it('returns null when there is nothing to insert', () => {
        expect(buildKeyInsert(7, {})).toBeNull();
    });
});
