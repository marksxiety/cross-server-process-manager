import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('../../config/db', () => ({
    default: { query: vi.fn(), connect: vi.fn() },
}));

import db from '../../config/db';
import { create, index, remove, update } from '../../controllers/templateController';

const query = db.query as unknown as Mock;
const connect = db.connect as unknown as Mock;

type MockResponse = Response & { status: Mock; json: Mock };

function createRequest(overrides: {
    params?: Record<string, string>;
    query?: Record<string, string>;
    body?: unknown;
}): Request {
    return {
        params: overrides.params ?? {},
        query: overrides.query ?? {},
        body: overrides.body ?? {},
    } as unknown as Request;
}

function createResponse(): MockResponse {
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    return res as unknown as MockResponse;
}

function responseBody(res: MockResponse): Record<string, unknown> {
    return res.json.mock.calls.at(-1)?.[0] as Record<string, unknown>;
}

const VALUES = {
    script: 'index.js',
    args: ['--port', '3000'],
    interpreter: 'C:\\Program Files\\nodejs\\node.exe',
};

const KEY_ROWS = [
    { template_id: 1, property_key: 'script', property_value: 'index.js', data_type: 'string' },
    { template_id: 1, property_key: 'args', property_value: '["--port","3000"]', data_type: 'array' },
    {
        template_id: 1,
        property_key: 'interpreter',
        property_value: 'C:\\Program Files\\nodejs\\node.exe',
        data_type: 'string',
    },
];

const TEMPLATE_ROW = {
    id: 1,
    template_name: 'Node',
    category: 'Node / JavaScript',
    description: 'Run a .js entry file.',
    preview: 'node index.js',
    is_active: true,
};

const TEMPLATE_RESPONSE = { ...TEMPLATE_ROW, values: VALUES };

beforeEach(() => {
    query.mockReset();
    connect.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('templateController.index', () => {
    it('returns template rows with values assembled from template_keys', async () => {
        query.mockResolvedValueOnce({ rows: [TEMPLATE_ROW] });
        query.mockResolvedValueOnce({ rows: KEY_ROWS });
        const res = createResponse();

        await index(createRequest({}), res);

        expect(res.status).not.toHaveBeenCalled();
        expect(responseBody(res)).toEqual({
            success: true,
            message: 'Templates retrieved successfully',
            info: [TEMPLATE_RESPONSE],
        });
        expect(query).toHaveBeenCalledTimes(2);

        const [sql, params] = query.mock.calls[0] as [string, unknown[]];
        expect(sql).toContain('FROM templates');
        expect(sql).not.toContain('t.values');
        expect(params).toEqual([false]);

        const [keySql, keyParams] = query.mock.calls[1] as [string, unknown[]];
        expect(keySql).toContain('FROM template_keys');
        expect(keyParams).toEqual([[1]]);
    });

    it('defaults to an empty values object when a template has no key rows', async () => {
        query.mockResolvedValueOnce({ rows: [TEMPLATE_ROW] });
        query.mockResolvedValueOnce({ rows: [] });
        const res = createResponse();

        await index(createRequest({}), res);

        const info = responseBody(res).info as Array<{ values: unknown }>;
        expect(info[0]?.values).toEqual({});
    });

    it('lists only active templates by default', async () => {
        query.mockResolvedValueOnce({ rows: [TEMPLATE_ROW] });
        query.mockResolvedValueOnce({ rows: KEY_ROWS });
        const res = createResponse();

        await index(createRequest({}), res);

        const [sql, params] = query.mock.calls[0] as [string, unknown[]];
        expect(sql).toContain('WHERE ($1::boolean OR t.is_active = TRUE)');
        expect(params).toEqual([false]);
    });

    it('lists all templates when with_inactive=true', async () => {
        query.mockResolvedValueOnce({ rows: [TEMPLATE_ROW] });
        query.mockResolvedValueOnce({ rows: KEY_ROWS });
        const res = createResponse();

        await index(createRequest({ query: { with_inactive: 'true' } }), res);

        const [, params] = query.mock.calls[0] as [string, unknown[]];
        expect(params).toEqual([true]);
    });

    it('responds 500 when the query fails', async () => {
        query.mockRejectedValueOnce(new Error('connection terminated'));
        const res = createResponse();

        await index(createRequest({}), res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(responseBody(res).code).toBe('INTERNAL_SERVER_ERROR');
    });
});

type ClientStub = { query: Mock; release: Mock };

function createClient(
    options: { rowCount?: number; rows?: unknown[]; keyRows?: unknown[] } = {}
): ClientStub {
    const { rowCount = 1, rows = [], keyRows = [] } = options;
    const client: ClientStub = { query: vi.fn(), release: vi.fn() };
    client.query.mockImplementation((sql: unknown) => {
        const text = typeof sql === 'string' ? sql : '';
        if (text.includes('FOR UPDATE')) return Promise.resolve({ rows: [], rowCount });
        if (text.includes('INSERT INTO templates')) {
            return Promise.resolve({ rows: [{ id: 1 }], rowCount: 1 });
        }
        if (text.includes('FROM template_keys')) {
            return Promise.resolve({ rows: keyRows, rowCount: keyRows.length });
        }
        if (text.includes('FROM templates')) {
            return Promise.resolve({ rows, rowCount: rows.length });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
    });
    return client;
}

function sqlCalls(client: ClientStub): string[] {
    return client.query.mock.calls.map((call) => call[0] as string);
}

describe('templateController.create', () => {
    const CREATE_BODY = {
        template_name: 'Deno',
        category: 'Deno',
        description: 'Run a Deno script.',
        preview: 'deno run --allow-net main.ts',
        values: { script: 'main.ts', interpreter: 'none' },
    };

    it('inserts the template and its keys, commits, and returns it', async () => {
        const client = createClient();
        connect.mockResolvedValueOnce(client);
        const res = createResponse();

        await create(createRequest({ body: CREATE_BODY }), res);

        expect(res.status).not.toHaveBeenCalled();
        expect(responseBody(res)).toEqual({
            success: true,
            message: 'Template registered successfully',
            info: {
                id: 1,
                template_name: 'Deno',
                category: 'Deno',
                description: 'Run a Deno script.',
                preview: 'deno run --allow-net main.ts',
                is_active: true,
                values: { script: 'main.ts', interpreter: 'none' },
            },
        });

        const calls = sqlCalls(client);
        expect(calls[0]).toBe('BEGIN');
        expect(calls.at(-1)).toBe('COMMIT');

        const insertTemplate = client.query.mock.calls.find((call) =>
            String(call[0]).includes('INSERT INTO templates')
        );
        expect(insertTemplate?.[1]).toEqual([
            'Deno',
            'Deno',
            'Run a Deno script.',
            'deno run --allow-net main.ts',
            true,
        ]);

        const insertKeys = client.query.mock.calls.find((call) =>
            String(call[0]).includes('INSERT INTO template_keys')
        );
        expect(insertKeys?.[1]).toEqual([
            1, 'script', 'main.ts', 'string',
            1, 'interpreter', 'none', 'string',
        ]);
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('defaults is_active to true, trims blank metadata, and skips the key insert for empty values', async () => {
        const client = createClient();
        connect.mockResolvedValueOnce(client);
        const res = createResponse();

        await create(
            createRequest({ body: { template_name: '  Deno  ', category: '   ' } }),
            res
        );

        expect(responseBody(res)).toEqual({
            success: true,
            message: 'Template registered successfully',
            info: {
                id: 1,
                template_name: 'Deno',
                category: null,
                description: null,
                preview: null,
                is_active: true,
                values: {},
            },
        });

        const insertTemplate = client.query.mock.calls.find((call) =>
            String(call[0]).includes('INSERT INTO templates')
        );
        expect(insertTemplate?.[1]).toEqual(['Deno', null, null, null, true]);
        expect(sqlCalls(client).some((text) => text.includes('INSERT INTO template_keys'))).toBe(
            false
        );
    });

    it('drops null values from the response to match what is stored', async () => {
        const client = createClient();
        connect.mockResolvedValueOnce(client);
        const res = createResponse();

        await create(
            createRequest({
                body: { template_name: 'Deno', values: { script: 'main.ts', note: null } },
            }),
            res
        );

        const info = responseBody(res).info as { values: unknown };
        expect(info.values).toEqual({ script: 'main.ts' });

        const insertKeys = client.query.mock.calls.find((call) =>
            String(call[0]).includes('INSERT INTO template_keys')
        );
        expect(insertKeys?.[1]).toEqual([1, 'script', 'main.ts', 'string']);
    });

    it('rejects a blank template name before touching the database', async () => {
        const res = createResponse();

        await create(createRequest({ body: { template_name: '   ' } }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(responseBody(res).code).toBe('VALIDATION_FAILED');
        expect(connect).not.toHaveBeenCalled();
    });

    it('rejects a blank key inside values before touching the database', async () => {
        const res = createResponse();

        await create(
            createRequest({
                body: { template_name: 'Deno', values: { '   ': 'x' } },
            }),
            res
        );

        expect(res.status).toHaveBeenCalledWith(400);
        expect(responseBody(res).code).toBe('VALIDATION_FAILED');
        expect(connect).not.toHaveBeenCalled();
    });

    it('rolls back and responds 409 when the template name already exists', async () => {
        const client = createClient();
        client.query.mockImplementation((sql: unknown) => {
            const text = typeof sql === 'string' ? sql : '';
            if (text.includes('INSERT INTO templates')) {
                return Promise.reject(
                    Object.assign(new Error('duplicate key value'), {
                        code: '23505',
                        constraint: 'templates_template_name_key',
                    })
                );
            }
            return Promise.resolve({ rows: [], rowCount: 0 });
        });
        connect.mockResolvedValueOnce(client);
        const res = createResponse();

        await create(createRequest({ body: CREATE_BODY }), res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(responseBody(res)).toEqual({
            success: false,
            message: 'Template "Deno" is already registered',
            code: 'DUPLICATE_TEMPLATE',
            info: null,
        });
        expect(sqlCalls(client)).toContain('ROLLBACK');
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('rolls back and responds 500 when the insert fails', async () => {
        const client = createClient();
        client.query.mockImplementation((sql: unknown) => {
            const text = typeof sql === 'string' ? sql : '';
            if (text.includes('INSERT INTO templates')) {
                return Promise.reject(new Error('deadlock detected'));
            }
            return Promise.resolve({ rows: [], rowCount: 0 });
        });
        connect.mockResolvedValueOnce(client);
        const res = createResponse();

        await create(createRequest({ body: CREATE_BODY }), res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(responseBody(res).code).toBe('INTERNAL_SERVER_ERROR');
        expect(sqlCalls(client)).toContain('ROLLBACK');
        expect(client.release).toHaveBeenCalledTimes(1);
    });
});

describe('templateController.update', () => {
    it('replaces the template keys and returns the stored template', async () => {
        const client = createClient({
            rows: [TEMPLATE_ROW],
            keyRows: [
                { template_id: 1, property_key: 'script', property_value: 'app.py', data_type: 'string' },
            ],
        });
        connect.mockResolvedValueOnce(client);
        const res = createResponse();

        await update(
            createRequest({ params: { id: '1' }, body: { values: { script: 'app.py' } } }),
            res
        );

        expect(res.status).not.toHaveBeenCalled();
        expect(responseBody(res)).toEqual({
            success: true,
            message: 'Template updated successfully',
            info: { ...TEMPLATE_ROW, values: { script: 'app.py' } },
        });

        const calls = sqlCalls(client);
        expect(calls[0]).toBe('BEGIN');
        expect(calls.at(-1)).toBe('COMMIT');

        const deleteKeys = client.query.mock.calls.find((call) =>
            String(call[0]).includes('DELETE FROM template_keys')
        );
        expect(deleteKeys?.[1]).toEqual([1]);

        const insertKeys = client.query.mock.calls.find((call) =>
            String(call[0]).includes('INSERT INTO template_keys')
        );
        expect(insertKeys?.[1]).toEqual([1, 'script', 'app.py', 'string']);

        const touchTemplate = client.query.mock.calls.find((call) =>
            String(call[0]).includes('UPDATE templates')
        );
        expect(touchTemplate?.[1]).toEqual([1]);
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('rejects a blank key inside values', async () => {
        const res = createResponse();

        await update(
            createRequest({ params: { id: '1' }, body: { values: { '  ': 'x' } } }),
            res
        );

        expect(res.status).toHaveBeenCalledWith(400);
        expect(responseBody(res).code).toBe('VALIDATION_FAILED');
        expect(connect).not.toHaveBeenCalled();
    });

    it('rolls back and responds 404 when the template does not exist', async () => {
        const client = createClient({ rowCount: 0 });
        connect.mockResolvedValueOnce(client);
        const res = createResponse();

        await update(
            createRequest({ params: { id: '99' }, body: { values: {} } }),
            res
        );

        expect(res.status).toHaveBeenCalledWith(404);
        expect(responseBody(res).code).toBe('NOT_FOUND');
        expect(sqlCalls(client)).toContain('ROLLBACK');
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('rejects an invalid id before touching the database', async () => {
        const res = createResponse();

        await update(createRequest({ params: { id: 'abc' }, body: { values: {} } }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(responseBody(res).code).toBe('INVALID_ID');
        expect(connect).not.toHaveBeenCalled();
    });

    it('rolls back and responds 500 when a write fails', async () => {
        const client = createClient({ rowCount: 1 });
        client.query.mockImplementation((sql: unknown) => {
            const text = typeof sql === 'string' ? sql : '';
            if (text.includes('UPDATE templates')) {
                return Promise.reject(new Error('deadlock detected'));
            }
            if (text.includes('FOR UPDATE')) return Promise.resolve({ rows: [], rowCount: 1 });
            return Promise.resolve({ rows: [], rowCount: 0 });
        });
        connect.mockResolvedValueOnce(client);
        const res = createResponse();

        await update(createRequest({ params: { id: '1' }, body: { values: {} } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(responseBody(res).code).toBe('INTERNAL_SERVER_ERROR');
        expect(sqlCalls(client)).toContain('ROLLBACK');
        expect(client.release).toHaveBeenCalledTimes(1);
    });
});

describe('templateController.remove', () => {
    const SUMMARY_ROW = {
        id: 1,
        template_name: 'Node',
        category: 'Node / JavaScript',
        description: 'Run a .js entry file.',
        preview: 'node index.js',
        is_active: true,
    };

    it('deletes the template and returns the removed row', async () => {
        query.mockResolvedValueOnce({ rows: [SUMMARY_ROW], rowCount: 1 });
        const res = createResponse();

        await remove(createRequest({ params: { id: '1' } }), res);

        expect(res.status).not.toHaveBeenCalled();
        expect(responseBody(res)).toEqual({
            success: true,
            message: 'Template removed successfully',
            info: SUMMARY_ROW,
        });

        const [sql, params] = query.mock.calls[0] as [string, unknown[]];
        expect(sql).toContain('DELETE FROM templates');
        expect(sql).toContain('RETURNING');
        expect(params).toEqual([1]);
    });

    it('responds 404 when the template does not exist', async () => {
        query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const res = createResponse();

        await remove(createRequest({ params: { id: '99' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(responseBody(res).code).toBe('NOT_FOUND');
    });

    it('rejects an invalid id before querying', async () => {
        const res = createResponse();

        await remove(createRequest({ params: { id: 'abc' } }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(responseBody(res).code).toBe('INVALID_ID');
        expect(query).not.toHaveBeenCalled();
    });

    it('responds 500 when the query fails', async () => {
        query.mockRejectedValueOnce(new Error('connection terminated'));
        const res = createResponse();

        await remove(createRequest({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(responseBody(res).code).toBe('INTERNAL_SERVER_ERROR');
    });
});
