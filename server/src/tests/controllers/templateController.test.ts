import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('../../config/db', () => ({
    default: { query: vi.fn() },
}));

import db from '../../config/db';
import { index } from '../../controllers/templateController';

const query = db.query as unknown as Mock;

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
