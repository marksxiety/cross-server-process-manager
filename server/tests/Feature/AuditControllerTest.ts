import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/Services/AuditService', () => ({
    auditAfter: vi.fn(),
    recordAudit: vi.fn(),
}));

vi.mock('../../src/Models/AuditLog', () => ({
    AuditLog: { recent: vi.fn() },
}));

import { AuditLog } from '../../src/Models/AuditLog';
import { AuditController } from '../../src/Http/Controllers/AuditController';
import { auditAfter } from '../../src/Services/AuditService';
import type { ServerService } from '../../src/Services/ServerService';
import type { PublicUser } from '../../src/Models/User';
import { createRequest, createResponse, invoke, responseBody } from '../Support/Http';

const user: PublicUser = {
    id: 3,
    email: 'alice@corp.local',
    name: 'Alice Cruz',
    is_admin: false,
    is_active: true,
    email_verified_at: new Date(),
    last_login_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    pages: ['dashboard'],
    events: ['process.stop'],
};

const serverRow = {
    id: 6,
    server: 'web-prod',
    protocol: 'http',
    host: '10.0.0.5',
    port: 5638,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
};

const findById = vi.fn();
const servers = { findById } as unknown as ServerService;

const controller = new AuditController(servers);

function signedIn(userRow: PublicUser = user) {
    const res = createResponse();
    (res as unknown as { locals: Record<string, unknown> }).locals = { user: userRow };
    return res;
}

beforeEach(() => {
    vi.mocked(auditAfter).mockReset();
    vi.mocked(AuditLog.recent).mockReset();
    findById.mockReset().mockResolvedValue(serverRow);
});

describe('AuditController.recordEvent', () => {
    it('records a process event for the signed-in user', async () => {
        const res = signedIn();

        await invoke(
            controller.recordEvent,
            createRequest({
                body: {
                    action: 'process.stop',
                    server_id: 6,
                    pm_id: 12,
                    process_name: 'api',
                },
            }),
            res
        );

        expect(res.status).not.toHaveBeenCalled();
        expect(auditAfter).toHaveBeenCalledWith(res, {
            userId: 3,
            category: 'process',
            action: 'stop',
            details: 'Stopped process api (pm_id 12) on web-prod',
            ip: null,
        });
    });

    it('rejects an action the user cannot perform', async () => {
        const res = signedIn({ ...user, events: [] });

        await invoke(
            controller.recordEvent,
            createRequest({
                body: { action: 'process.stop', server_id: 6, pm_id: 12 },
            }),
            res
        );

        expect(res.status).toHaveBeenCalledWith(403);
        expect(auditAfter).not.toHaveBeenCalled();
    });

    it('allows an admin without an explicit grant', async () => {
        const res = signedIn({ ...user, is_admin: true, events: [] });

        await invoke(
            controller.recordEvent,
            createRequest({
                body: { action: 'process.delete', server_id: 6, pm_id: 12 },
            }),
            res
        );

        expect(res.status).not.toHaveBeenCalled();
        expect(auditAfter).toHaveBeenCalled();
    });

    it('rejects an unknown server', async () => {
        findById.mockResolvedValueOnce(undefined);
        const res = signedIn();

        await invoke(
            controller.recordEvent,
            createRequest({
                body: { action: 'process.stop', server_id: 99, pm_id: 12 },
            }),
            res
        );

        expect(res.status).toHaveBeenCalledWith(404);
        expect(auditAfter).not.toHaveBeenCalled();
    });

    it('rejects an invalid payload before writing', async () => {
        const res = signedIn();

        await invoke(
            controller.recordEvent,
            createRequest({ body: { action: 'process.stop' } }),
            res
        );

        expect(res.status).toHaveBeenCalledWith(400);
        expect(auditAfter).not.toHaveBeenCalled();
    });
});

describe('AuditController.recent', () => {
    it('returns the latest rows', async () => {
        const rows = [{ id: 1, action: 'auth.login', details: null }];
        vi.mocked(AuditLog.recent).mockResolvedValueOnce(rows as never);
        const res = createResponse();

        await invoke(controller.recent, createRequest({ query: { limit: '50' } }), res);

        expect(AuditLog.recent).toHaveBeenCalledWith(50);
        expect(responseBody(res)).toEqual({
            success: true,
            message: 'Audit log retrieved successfully',
            info: rows,
        });
    });
});
