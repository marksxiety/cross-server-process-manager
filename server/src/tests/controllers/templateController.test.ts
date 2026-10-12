import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('../../config/db', () => ({
    default: { query: vi.fn(), beginTransaction: vi.fn() },
}));

import db from '../../config/db';
import { create, index, remove, update } from '../../controllers/templateController';

const query = db.query as unknown as Mock;
const beginTransaction = db.beginTransaction as unknown as Mock;

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
    beginTransaction.mockReset();
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
        expect(keySql).toContain('IN (@p1)');
        expect(keyParams).toEqual([1]);
    });

    it('defaults to an empty values object when a template has no key rows', async () => {
        query.mockResolvedValueOnce({ rows: [TEMPLATE_ROW] });
        query.mockResolvedValueOnce({ rows: [] });
        const res = createResponse();

        await index(createRequest({}), res);

        const info = responseBody(res).info as Array<{ values: unknown }>;
        expect(info[0]?.values).toEqual({});
    });

    it('skips the key query when no templates are returned', async () => {
        query.mockResolvedValueOnce({ rows: [] });
        const res = createResponse();

        await index(createRequest({}), res);

        expect(query).toHaveBeenCalledTimes(1);
    });

    it('lists only active templates by default', async () => {
        query.mockResolvedValueOnce({ rows: [TEMPLATE_ROW] });
        query.mockResolvedValueOnce({ rows: KEY_ROWS });
        const res = createResponse();

        await index(createRequest({}), res);

        const [sql, params] = query.mock.calls[0] as [string, unknown[]];
        expect(sql).toContain('WHERE (@p1 = 1 OR t.is_active = 1)');
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

type SessionStub = { query: Mock; commit: Mock; rollback: Mock };

function createSession(
    options: { rowCount?: number; rows?: unknown[]; keyRows?: unknown[] } = {}
): SessionStub {
    const { rowCount = 1, rows = [], keyRows = [] } = options;
    const session: SessionStub = {
        query: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
    };
    session.query.mockImplementation((sql: unknown) => {
        const text = typeof sql === 'string' ? sql : '';
        if (text.includes('UPDLOCK')) return Promise.resolve({ rows: [], rowCount });
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
    return session;
}

function sqlCalls(session: SessionStub): string[] {
    return session.query.mock.calls.map((call) => call[0] as string);
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
        const session = createSession();
        beginTransaction.mockResolvedValueOnce(session);
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

        expect(session.commit).toHaveBeenCalledTimes(1);
        expect(session.rollback).not.toHaveBeenCalled();

        const insertTemplate = session.query.mock.calls.find((call) =>
            String(call[0]).includes('INSERT INTO templates')
        );
        expect(String(insertTemplate?.[0])).toContain('OUTPUT INSERTED.id');
        expect(insertTemplate?.[1]).toEqual([
            'Deno',
            'Deno',
            'Run a Deno script.',
            'deno run --allow-net main.ts',
            true,
        ]);

        const insertKeys = session.query.mock.calls.find((call) =>
            String(call[0]).includes('INSERT INTO template_keys')
        );
        expect(insertKeys?.[1]).toEqual([
            1, 'script', 'main.ts', 'string',
            1, 'interpreter', 'none', 'string',
        ]);
    });

    it('defaults is_active to true, trims blank metadata, and skips the key insert for empty values', async () => {
        const session = createSession();
        beginTransaction.mockResolvedValueOnce(session);
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

        const insertTemplate = session.query.mock.calls.find((call) =>
            String(call[0]).includes('INSERT INTO templates')
        );
        expect(insertTemplate?.[1]).toEqual(['Deno', null, null, null, true]);
        expect(sqlCalls(session).some((text) => text.includes('INSERT INTO template_keys'))).toBe(
            false
        );
    });

    it('drops null values from the response to match what is stored', async () => {
        const session = createSession();
        beginTransaction.mockResolvedValueOnce(session);
        const res = createResponse();

        await create(
            createRequest({
                body: { template_name: 'Deno', values: { script: 'main.ts', note: null } },
            }),
            res
        );

        const info = responseBody(res).info as { values: unknown };
        expect(info.values).toEqual({ script: 'main.ts' });

        const insertKeys = session.query.mock.calls.find((call) =>
            String(call[0]).includes('INSERT INTO template_keys')
        );
        expect(insertKeys?.[1]).toEqual([1, 'script', 'main.ts', 'string']);
    });

    it('rejects a blank template name before touching the database', async () => {
        const res = createResponse();

        await create(createRequest({ body: { template_name: '   ' } }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(responseBody(res).code).toBe('VALIDATION_FAILED');
        expect(beginTransaction).not.toHaveBeenCalled();
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
        expect(beginTransaction).not.toHaveBeenCalled();
    });

    it('rolls back and responds 409 when the template name already exists', async () => {
        const session = createSession();
        session.query.mockImplementation((sql: unknown) => {
            const text = typeof sql === 'string' ? sql : '';
            if (text.includes('INSERT INTO templates')) {
                return Promise.reject(
                    Object.assign(
                        new Error(
                            "Violation of UNIQUE KEY constraint 'templates_template_name_key'. " +
                                "Cannot insert duplicate key in object 'dbo.templates'."
                        ),
                        { number: 2627 }
                    )
                );
            }
            return Promise.resolve({ rows: [], rowCount: 0 });
        });
        beginTransaction.mockResolvedValueOnce(session);
        const res = createResponse();

        await create(createRequest({ body: CREATE_BODY }), res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(responseBody(res)).toEqual({
            success: false,
            message: 'Template "Deno" is already registered',
            code: 'DUPLICATE_TEMPLATE',
            info: null,
        });
        expect(session.rollback).toHaveBeenCalledTimes(1);
        expect(session.commit).not.toHaveBeenCalled();
    });

    it('rolls back and responds 400 when a key check constraint is violated', async () => {
        const session = createSession();
        session.query.mockImplementation((sql: unknown) => {
            const text = typeof sql === 'string' ? sql : '';
            if (text.includes('INSERT INTO template_keys')) {
                return Promise.reject(
                    Object.assign(
                        new Error(
                            'The INSERT statement conflicted with the CHECK constraint ' +
                                '"template_keys_data_type_check". The conflict occurred in database "backend".'
                        ),
                        { number: 547 }
                    )
                );
            }
            if (text.includes('INSERT INTO templates')) {
                return Promise.resolve({ rows: [{ id: 1 }], rowCount: 1 });
            }
            return Promise.resolve({ rows: [], rowCount: 0 });
        });
        beginTransaction.mockResolvedValueOnce(session);
        const res = createResponse();

        await create(createRequest({ body: CREATE_BODY }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(responseBody(res).code).toBe('VALIDATION_FAILED');
        expect(session.rollback).toHaveBeenCalledTimes(1);
        expect(session.commit).not.toHaveBeenCalled();
    });

    it('rolls back and responds 500 when the insert fails', async () => {
        const session = createSession();
        session.query.mockImplementation((sql: unknown) => {
            const text = typeof sql === 'string' ? sql : '';
            if (text.includes('INSERT INTO templates')) {
                return Promise.reject(new Error('deadlock detected'));
            }
            return Promise.resolve({ rows: [], rowCount: 0 });
        });
        beginTransaction.mockResolvedValueOnce(session);
        const res = createResponse();

        await create(createRequest({ body: CREATE_BODY }), res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(responseBody(res).code).toBe('INTERNAL_SERVER_ERROR');
        expect(session.rollback).toHaveBeenCalledTimes(1);
        expect(session.commit).not.toHaveBeenCalled();
    });
});

describe('templateController.update', () => {
    it('replaces the template keys and returns the stored template', async () => {
        const session = createSession({
            rows: [TEMPLATE_ROW],
            keyRows: [
                { template_id: 1, property_key: 'script', property_value: 'app.py', data_type: 'string' },
            ],
        });
        beginTransaction.mockResolvedValueOnce(session);
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

        expect(session.commit).toHaveBeenCalledTimes(1);
        expect(session.rollback).not.toHaveBeenCalled();

        const lock = session.query.mock.calls.find((call) =>
            String(call[0]).includes('UPDLOCK')
        );
        expect(String(lock?.[0])).toContain('WITH (UPDLOCK)');
        expect(lock?.[1]).toEqual([1]);

        const deleteKeys = session.query.mock.calls.find((call) =>
            String(call[0]).includes('DELETE FROM template_keys')
        );
        expect(deleteKeys?.[1]).toEqual([1]);

        const insertKeys = session.query.mock.calls.find((call) =>
            String(call[0]).includes('INSERT INTO template_keys')
        );
        expect(insertKeys?.[1]).toEqual([1, 'script', 'app.py', 'string']);

        const touchTemplate = session.query.mock.calls.find((call) =>
            String(call[0]).includes('UPDATE templates')
        );
        expect(String(touchTemplate?.[0])).toContain('SYSDATETIME()');
        expect(touchTemplate?.[1]).toEqual([1]);
    });

    it('rejects a blank key inside values', async () => {
        const res = createResponse();

        await update(
            createRequest({ params: { id: '1' }, body: { values: { '  ': 'x' } } }),
            res
        );

        expect(res.status).toHaveBeenCalledWith(400);
        expect(responseBody(res).code).toBe('VALIDATION_FAILED');
        expect(beginTransaction).not.toHaveBeenCalled();
    });

    it('rolls back and responds 404 when the template does not exist', async () => {
        const session = createSession({ rowCount: 0 });
        beginTransaction.mockResolvedValueOnce(session);
        const res = createResponse();

        await update(
            createRequest({ params: { id: '99' }, body: { values: {} } }),
            res
        );

        expect(res.status).toHaveBeenCalledWith(404);
        expect(responseBody(res).code).toBe('NOT_FOUND');
        expect(session.rollback).toHaveBeenCalledTimes(1);
        expect(session.commit).not.toHaveBeenCalled();
    });

    it('rejects an invalid id before touching the database', async () => {
        const res = createResponse();

        await update(createRequest({ params: { id: 'abc' }, body: { values: {} } }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(responseBody(res).code).toBe('INVALID_ID');
        expect(beginTransaction).not.toHaveBeenCalled();
    });

    it('rolls back and responds 500 when a write fails', async () => {
        const session = createSession({ rowCount: 1 });
        session.query.mockImplementation((sql: unknown) => {
            const text = typeof sql === 'string' ? sql : '';
            if (text.includes('UPDATE templates')) {
                return Promise.reject(new Error('deadlock detected'));
            }
            if (text.includes('UPDLOCK')) return Promise.resolve({ rows: [], rowCount: 1 });
            return Promise.resolve({ rows: [], rowCount: 0 });
        });
        beginTransaction.mockResolvedValueOnce(session);
        const res = createResponse();

        await update(createRequest({ params: { id: '1' }, body: { values: {} } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(responseBody(res).code).toBe('INTERNAL_SERVER_ERROR');
        expect(session.rollback).toHaveBeenCalledTimes(1);
        expect(session.commit).not.toHaveBeenCalled();
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
        expect(sql).toContain('OUTPUT DELETED');
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
