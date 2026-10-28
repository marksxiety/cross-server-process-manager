import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('../../src/Persistence/Connection', () => ({
    default: { query: vi.fn() },
}));

vi.mock('../../src/Services/AuditService', () => ({
    auditAfter: vi.fn(),
    recordAudit: vi.fn(),
}));

import db from '../../src/Persistence/Connection';
import { ServerController } from '../../src/Http/Controllers/ServerController';
import { ServerService } from '../../src/Services/ServerService';
import {
    createRequest,
    createResponse,
    invoke,
    responseBody,
} from '../Support/Http';

const query = db.query as unknown as Mock;
const controller = new ServerController(new ServerService());

function uniqueViolation(constraint: string): Error & { number: number } {
    return Object.assign(
        new Error(
            `Violation of UNIQUE KEY constraint '${constraint}'. ` +
                "Cannot insert duplicate key in object 'dbo.servers'."
        ),
        { number: 2627 }
    );
}

const VALID_BODY = {
    server: 'app-1',
    protocol: 'http',
    host: '127.0.0.1',
    port: 4000,
};

const SERVER_ROW = {
    id: 1,
    server: 'app-1',
    protocol: 'http',
    host: '127.0.0.1',
    port: 4000,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
};

beforeEach(() => {
    query.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('ServerController.store', () => {
    it('inserts a valid payload and responds with the created row', async () => {
        query.mockResolvedValueOnce({ rows: [SERVER_ROW] });
        const res = createResponse();

        await invoke(controller.store, createRequest({ body: VALID_BODY }), res);

        expect(res.status).not.toHaveBeenCalled();
        expect(responseBody(res)).toEqual({
            success: true,
            message: 'Server registered successfully',
            info: SERVER_ROW,
        });
        expect(query).toHaveBeenCalledTimes(1);
        const [sql, params] = query.mock.calls[0] as [string, unknown[]];
        expect(sql).toContain('INSERT INTO servers');
        expect(sql).toContain('OUTPUT INSERTED.*');
        expect(params).toEqual(['app-1', 'http', '127.0.0.1', 4000, true]);
    });

    it('passes is_active false through to the insert', async () => {
        query.mockResolvedValueOnce({ rows: [{ ...SERVER_ROW, is_active: false }] });
        const res = createResponse();

        await invoke(controller.store, createRequest({ body: { ...VALID_BODY, is_active: false } }), res);

        const [, params] = query.mock.calls[0] as [string, unknown[]];
        expect(params).toEqual(['app-1', 'http', '127.0.0.1', 4000, false]);
    });

    it('responds 400 with field errors when the payload is invalid', async () => {
        const res = createResponse();

        await invoke(controller.store, createRequest({ body: { ...VALID_BODY, host: undefined } }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        const body = responseBody(res);
        expect(body.code).toBe('VALIDATION_FAILED');
        expect((body.info as Record<string, string[]>).host).toContain('Host is required');
        expect(query).not.toHaveBeenCalled();
    });

    it('responds 409 DUPLICATE_SERVER when the server name constraint is violated', async () => {
        query.mockRejectedValueOnce(uniqueViolation('servers_server_key'));
        const res = createResponse();

        await invoke(controller.store, createRequest({ body: VALID_BODY }), res);

        expect(res.status).toHaveBeenCalledWith(409);
        const body = responseBody(res);
        expect(body.code).toBe('DUPLICATE_SERVER');
        expect(body.message).toBe('Server "app-1" is already registered');
    });

    it('responds 409 DUPLICATE_HOST when the host constraint is violated', async () => {
        query.mockRejectedValueOnce(uniqueViolation('servers_host_unique'));
        const res = createResponse();

        await invoke(controller.store, createRequest({ body: VALID_BODY }), res);

        expect(res.status).toHaveBeenCalledWith(409);
        const body = responseBody(res);
        expect(body.code).toBe('DUPLICATE_HOST');
        expect(body.message).toBe('Host "127.0.0.1" is already registered');
    });

    it('responds 409 DUPLICATE_SERVER for an unrecognized unique violation', async () => {
        query.mockRejectedValueOnce(uniqueViolation('some_other_unique'));
        const res = createResponse();

        await invoke(controller.store, createRequest({ body: VALID_BODY }), res);

        expect(responseBody(res).code).toBe('DUPLICATE_SERVER');
    });

    it('responds 500 when the insert fails for another reason', async () => {
        query.mockRejectedValueOnce(new Error('connection terminated'));
        const res = createResponse();

        await invoke(controller.store, createRequest({ body: VALID_BODY }), res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(responseBody(res).code).toBe('INTERNAL_SERVER_ERROR');
    });
});

describe('ServerController.update', () => {
    it('responds 400 INVALID_ID without touching the database', async () => {
        const res = createResponse();

        await invoke(controller.update, createRequest({ params: { id: 'abc' }, body: VALID_BODY }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(responseBody(res).code).toBe('INVALID_ID');
        expect(query).not.toHaveBeenCalled();
    });

    it('responds 400 with field errors when the payload is invalid', async () => {
        const res = createResponse();

        await invoke(controller.update, 
            createRequest({ params: { id: '1' }, body: { ...VALID_BODY, port: 0 } }),
            res
        );

        expect(res.status).toHaveBeenCalledWith(400);
        const body = responseBody(res);
        expect(body.code).toBe('VALIDATION_FAILED');
        expect((body.info as Record<string, string[]>).port).toContain('Port must be at least 1');
        expect(query).not.toHaveBeenCalled();
    });

    it('responds 404 when the target server does not exist', async () => {
        query.mockResolvedValueOnce({
            rows: [{ target_exists: false, name_taken: false, host_taken: false }],
        });
        const res = createResponse();

        await invoke(controller.update, createRequest({ params: { id: '999' }, body: VALID_BODY }), res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(responseBody(res).code).toBe('NOT_FOUND');
        expect(query).toHaveBeenCalledTimes(1);
    });

    it('responds 409 DUPLICATE_SERVER when another row owns the name', async () => {
        query.mockResolvedValueOnce({
            rows: [{ target_exists: true, name_taken: true, host_taken: false }],
        });
        const res = createResponse();

        await invoke(controller.update, createRequest({ params: { id: '1' }, body: VALID_BODY }), res);

        expect(res.status).toHaveBeenCalledWith(409);
        const body = responseBody(res);
        expect(body.code).toBe('DUPLICATE_SERVER');
        expect(body.message).toBe('Server "app-1" is already registered');
        expect(query).toHaveBeenCalledTimes(1);
    });

    it('responds 409 DUPLICATE_HOST when another row owns the host', async () => {
        query.mockResolvedValueOnce({
            rows: [{ target_exists: true, name_taken: false, host_taken: true }],
        });
        const res = createResponse();

        await invoke(controller.update, createRequest({ params: { id: '1' }, body: VALID_BODY }), res);

        expect(res.status).toHaveBeenCalledWith(409);
        const body = responseBody(res);
        expect(body.code).toBe('DUPLICATE_HOST');
        expect(body.message).toBe('Host "127.0.0.1" is already registered');
        expect(query).toHaveBeenCalledTimes(1);
    });

    it('updates the row, preserves is_active when omitted and refreshes updated_at', async () => {
        query.mockResolvedValueOnce({
            rows: [{ target_exists: true, name_taken: false, host_taken: false }],
        });
        query.mockResolvedValueOnce({ rows: [SERVER_ROW] });
        const res = createResponse();

        await invoke(controller.update, createRequest({ params: { id: '1' }, body: VALID_BODY }), res);

        expect(res.status).not.toHaveBeenCalled();
        expect(responseBody(res)).toEqual({
            success: true,
            message: 'Server updated successfully',
            info: SERVER_ROW,
        });
        expect(query).toHaveBeenCalledTimes(2);
        const [sql, params] = query.mock.calls[1] as [string, unknown[]];
        expect(sql).toContain('updated_at = SYSDATETIME()');
        expect(sql).toContain('COALESCE(CAST(@p5 AS BIT), is_active)');
        expect(params).toEqual(['app-1', 'http', '127.0.0.1', 4000, null, 1]);
    });

    it('passes is_active false through to the update', async () => {
        query.mockResolvedValueOnce({
            rows: [{ target_exists: true, name_taken: false, host_taken: false }],
        });
        query.mockResolvedValueOnce({ rows: [{ ...SERVER_ROW, is_active: false }] });
        const res = createResponse();

        await invoke(controller.update, 
            createRequest({ params: { id: '1' }, body: { ...VALID_BODY, is_active: false } }),
            res
        );

        const [, params] = query.mock.calls[1] as [string, unknown[]];
        expect(params).toEqual(['app-1', 'http', '127.0.0.1', 4000, false, 1]);
    });

    it('responds 409 DUPLICATE_HOST when the update hits the host constraint race', async () => {
        query.mockResolvedValueOnce({
            rows: [{ target_exists: true, name_taken: false, host_taken: false }],
        });
        query.mockRejectedValueOnce(uniqueViolation('servers_host_unique'));
        const res = createResponse();

        await invoke(controller.update, createRequest({ params: { id: '1' }, body: VALID_BODY }), res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(responseBody(res).code).toBe('DUPLICATE_HOST');
    });
});

describe('ServerController.destroy', () => {
    it('responds 400 INVALID_ID without touching the database', async () => {
        const res = createResponse();

        await invoke(controller.destroy, createRequest({ params: { id: '0' } }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(responseBody(res).code).toBe('INVALID_ID');
        expect(query).not.toHaveBeenCalled();
    });

    it('responds 404 when the server does not exist', async () => {
        query.mockResolvedValueOnce({ rows: [] });
        const res = createResponse();

        await invoke(controller.destroy, createRequest({ params: { id: '999' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(responseBody(res).code).toBe('NOT_FOUND');
    });

    it('deletes the server and responds with the removed row', async () => {
        query.mockResolvedValueOnce({ rows: [SERVER_ROW] });
        const res = createResponse();

        await invoke(controller.destroy, createRequest({ params: { id: '1' } }), res);

        expect(res.status).not.toHaveBeenCalled();
        expect(responseBody(res)).toEqual({
            success: true,
            message: 'Server removed successfully',
            info: SERVER_ROW,
        });
        const [sql, params] = query.mock.calls[0] as [string, unknown[]];
        expect(sql).toContain('DELETE FROM servers');
        expect(sql).toContain('OUTPUT DELETED.*');
        expect(params).toEqual([1]);
    });
});

describe('ServerController.index', () => {
    it('lists only active servers by default', async () => {
        query.mockResolvedValueOnce({ rows: [SERVER_ROW] });
        const res = createResponse();

        await invoke(controller.index, createRequest({}), res);

        const [sql] = query.mock.calls[0] as [string];
        expect(sql).toContain('WHERE is_active = 1');
        expect(responseBody(res)).toEqual({
            success: true,
            message: 'Servers retrieved successfully',
            info: [SERVER_ROW],
        });
    });

    it('lists all servers when with_inactive=true', async () => {
        query.mockResolvedValueOnce({ rows: [SERVER_ROW] });
        const res = createResponse();

        await invoke(controller.index, createRequest({ query: { with_inactive: 'true' } }), res);

        const [sql] = query.mock.calls[0] as [string];
        expect(sql).not.toContain('WHERE');
    });

    it('responds 500 when the query fails', async () => {
        query.mockRejectedValueOnce(new Error('connection terminated'));
        const res = createResponse();

        await invoke(controller.index, createRequest({}), res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(responseBody(res).code).toBe('INTERNAL_SERVER_ERROR');
    });
});
