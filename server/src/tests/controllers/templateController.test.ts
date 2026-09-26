import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('../../config/db', () => ({
    default: { query: vi.fn(), connect: vi.fn() },
}));

import db from '../../config/db';
import { index, update } from '../../controllers/templateController';

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

const TEMPLATE_ROW = {
    id: 1,
    template_name: 'Node',
    category: 'Node / JavaScript',
    description: 'Run a .js/.mjs/.cjs entry file directly under node.exe.',
    preview: 'node --env-file=.env index.js --port 3000',
    is_active: true,
};

const SCRIPT_KEY = {
    property_key: 'script',
    property_value: 'index.js',
    data_type: 'string',
    is_required: true,
    is_hidden: false,
    is_locked: false,
};

const ARGS_KEY = {
    property_key: 'args',
    property_value: '["--port","3000"]',
    data_type: 'array',
    is_required: false,
    is_hidden: false,
    is_locked: false,
};

const HIDDEN_KEY = {
    property_key: 'exec_mode',
    property_value: null,
    data_type: 'string',
    is_required: false,
    is_hidden: true,
    is_locked: false,
};

const KEYLESS_ROW = {
    ...TEMPLATE_ROW,
    property_key: null,
    property_value: null,
    data_type: null,
    is_required: null,
    is_hidden: null,
    is_locked: null,
};

beforeEach(() => {
    query.mockReset();
    connect.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('templateController.index', () => {
    it("groups a template's key rows into a nested keys array in order", async () => {
        query.mockResolvedValueOnce({
            rows: [
                { ...TEMPLATE_ROW, ...SCRIPT_KEY },
                { ...TEMPLATE_ROW, ...ARGS_KEY },
                { ...TEMPLATE_ROW, ...HIDDEN_KEY },
            ],
        });
        const res = createResponse();

        await index(createRequest({}), res);

        expect(res.status).not.toHaveBeenCalled();
        expect(responseBody(res)).toEqual({
            success: true,
            message: 'Templates retrieved successfully',
            info: [{ ...TEMPLATE_ROW, keys: [SCRIPT_KEY, ARGS_KEY, HIDDEN_KEY] }],
        });
        expect(query).toHaveBeenCalledTimes(1);
    });

    it('returns keys: [] for a keyless template (LEFT JOIN null row)', async () => {
        query.mockResolvedValueOnce({ rows: [KEYLESS_ROW] });
        const res = createResponse();

        await index(createRequest({}), res);

        const info = responseBody(res).info as Array<{ keys: unknown[] }>;
        expect(info).toHaveLength(1);
        expect(info[0]?.keys).toEqual([]);
    });

    it('passes a null preview through unchanged', async () => {
        query.mockResolvedValueOnce({ rows: [{ ...TEMPLATE_ROW, preview: null, ...SCRIPT_KEY }] });
        const res = createResponse();

        await index(createRequest({}), res);

        const info = responseBody(res).info as Array<{ preview: string | null }>;
        expect(info[0]?.preview).toBeNull();
    });

    it('keeps separate templates distinct and preserves query order', async () => {
        query.mockResolvedValueOnce({
            rows: [
                { ...TEMPLATE_ROW, ...SCRIPT_KEY },
                {
                    ...TEMPLATE_ROW,
                    id: 2,
                    template_name: 'npm',
                    ...ARGS_KEY,
                },
            ],
        });
        const res = createResponse();

        await index(createRequest({}), res);

        const info = responseBody(res).info as Array<{ id: number; keys: unknown[] }>;
        expect(info.map((t) => t.id)).toEqual([1, 2]);
        expect(info[0]?.keys).toHaveLength(1);
        expect(info[1]?.keys).toHaveLength(1);
    });

    it('lists only active templates by default', async () => {
        query.mockResolvedValueOnce({ rows: [TEMPLATE_ROW] });
        const res = createResponse();

        await index(createRequest({}), res);

        const [sql, params] = query.mock.calls[0] as [string, unknown[]];
        expect(sql).toContain('WHERE ($1::boolean OR t.is_active = TRUE)');
        expect(params).toEqual([false]);
    });

    it('lists all templates when with_inactive=true', async () => {
        query.mockResolvedValueOnce({ rows: [TEMPLATE_ROW] });
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

const INPUT_KEY = {
    property_key: 'script',
    property_value: 'index.js',
    data_type: 'string',
    is_required: true,
    is_hidden: false,
    is_locked: false,
};

type ClientStub = { query: Mock; release: Mock };

function createClient(options: { rowCount?: number; rows?: unknown[] } = {}): ClientStub {
    const { rowCount = 1, rows = [] } = options;
    const client: ClientStub = { query: vi.fn(), release: vi.fn() };
    client.query.mockImplementation((sql: unknown) => {
        const text = typeof sql === 'string' ? sql : '';
        if (text.includes('FOR UPDATE')) return Promise.resolve({ rows: [], rowCount });
        if (text.includes('FROM templates t')) {
            return Promise.resolve({ rows, rowCount: rows.length });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
    });
    return client;
}

function sqlCalls(client: ClientStub): string[] {
    return client.query.mock.calls.map((call) => call[0] as string);
}

describe('templateController.update', () => {
    it("upserts the submitted keys and commits, returning the nested template", async () => {
        const savedRow = { ...TEMPLATE_ROW, ...SCRIPT_KEY };
        const client = createClient({ rows: [savedRow] });
        connect.mockResolvedValueOnce(client);
        const res = createResponse();

        await update(createRequest({ params: { id: '1' }, body: { keys: [INPUT_KEY] } }), res);

        expect(res.status).not.toHaveBeenCalled();
        expect(responseBody(res)).toEqual({
            success: true,
            message: 'Template updated successfully',
            info: { ...TEMPLATE_ROW, keys: [SCRIPT_KEY] },
        });

        const calls = sqlCalls(client);
        expect(calls[0]).toBe('BEGIN');
        expect(calls.at(-1)).toBe('COMMIT');

        const insert = client.query.mock.calls.find((call) =>
            String(call[0]).includes('INSERT INTO template_keys')
        );
        expect(insert?.[1]).toEqual([
            1,
            'script',
            'index.js',
            'string',
            true,
            false,
            false,
        ]);

        expect(
            calls.some((sql) => sql.includes('DELETE FROM template_keys'))
        ).toBe(true);
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('prunes every stored key when the submitted array is empty', async () => {
        const client = createClient({ rows: [KEYLESS_ROW] });
        connect.mockResolvedValueOnce(client);
        const res = createResponse();

        await update(createRequest({ params: { id: '1' }, body: { keys: [] } }), res);

        const calls = sqlCalls(client);
        expect(calls.some((sql) => sql.includes('INSERT INTO template_keys'))).toBe(false);

        const del = client.query.mock.calls.find((call) =>
            String(call[0]).includes('DELETE FROM template_keys')
        );
        expect(del?.[1]).toEqual([1, []]);
        expect(responseBody(res).success).toBe(true);
    });

    it('rolls back and responds 404 when the template does not exist', async () => {
        const client = createClient({ rowCount: 0 });
        connect.mockResolvedValueOnce(client);
        const res = createResponse();

        await update(createRequest({ params: { id: '99' }, body: { keys: [INPUT_KEY] } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(responseBody(res).code).toBe('NOT_FOUND');
        expect(sqlCalls(client)).toContain('ROLLBACK');
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('rejects an invalid id before touching the database', async () => {
        const res = createResponse();

        await update(createRequest({ params: { id: 'abc' }, body: { keys: [] } }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(responseBody(res).code).toBe('INVALID_ID');
        expect(connect).not.toHaveBeenCalled();
    });

    it('rejects a key with a blank property_key', async () => {
        const res = createResponse();

        await update(
            createRequest({
                params: { id: '1' },
                body: { keys: [{ ...INPUT_KEY, property_key: '   ' }] },
            }),
            res
        );

        expect(res.status).toHaveBeenCalledWith(400);
        expect(responseBody(res).code).toBe('VALIDATION_FAILED');
        expect(connect).not.toHaveBeenCalled();
    });

    it('rejects duplicate property_key values', async () => {
        const res = createResponse();

        await update(
            createRequest({ params: { id: '1' }, body: { keys: [INPUT_KEY, INPUT_KEY] } }),
            res
        );

        expect(res.status).toHaveBeenCalledWith(400);
        expect(responseBody(res).code).toBe('VALIDATION_FAILED');
        expect(connect).not.toHaveBeenCalled();
    });

    it('rolls back and responds 500 when a write fails', async () => {
        const client = createClient({ rowCount: 1 });
        client.query.mockImplementation((sql: unknown) => {
            const text = typeof sql === 'string' ? sql : '';
            if (text.includes('INSERT INTO template_keys')) {
                return Promise.reject(new Error('deadlock detected'));
            }
            if (text.includes('FOR UPDATE')) return Promise.resolve({ rows: [], rowCount: 1 });
            return Promise.resolve({ rows: [], rowCount: 0 });
        });
        connect.mockResolvedValueOnce(client);
        const res = createResponse();

        await update(createRequest({ params: { id: '1' }, body: { keys: [INPUT_KEY] } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(responseBody(res).code).toBe('INTERNAL_SERVER_ERROR');
        expect(sqlCalls(client)).toContain('ROLLBACK');
        expect(client.release).toHaveBeenCalledTimes(1);
    });
});
