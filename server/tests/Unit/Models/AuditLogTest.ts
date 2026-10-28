import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('../../../src/Persistence/Connection', () => ({
    default: { query: vi.fn() },
}));

import db from '../../../src/Persistence/Connection';
import { AuditLog } from '../../../src/Models/AuditLog';

const query = db.query as unknown as Mock;

beforeEach(() => {
    query.mockReset();
});

describe('AuditLog', () => {
    it('stores category, action, plain-text details and the attribution columns', async () => {
        query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

        await AuditLog.record({
            userId: 3,
            category: 'process',
            action: 'restart',
            details: 'Restarted process api (pm_id 12) on web-prod',
            ip: '192.168.1.20',
        });

        const [sql, params] = query.mock.calls[0] as [string, unknown[]];
        expect(sql).toContain('INSERT INTO audit_log');
        expect(sql).toContain('SYSUTCDATETIME()');
        expect(params).toEqual([
            3,
            'process',
            'restart',
            'Restarted process api (pm_id 12) on web-prod',
            '192.168.1.20',
        ]);
    });

    it('stores null details when none are provided', async () => {
        query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

        await AuditLog.record({ category: 'auth', action: 'logout', ip: null });

        const [, params] = query.mock.calls[0] as [string, unknown[]];
        expect(params).toEqual([null, 'auth', 'logout', null, null]);
    });

    it('returns the viewer rows with a numeric id', async () => {
        query.mockResolvedValueOnce({
            rows: [
                {
                    id: '7',
                    user_id: 3,
                    category: 'server',
                    action: 'update',
                    details: 'Updated server LOCAL: name LOCAL1 → LOCAL',
                    ip_address: '192.168.1.20',
                    created_at: new Date(),
                    user_name: 'Alice Cruz',
                    user_email: 'alice@corp.local',
                },
            ],
        });

        const rows = await AuditLog.recent(200);

        expect(rows[0]?.id).toBe(7);
        expect(rows[0]?.details).toBe('Updated server LOCAL: name LOCAL1 → LOCAL');
        expect(rows[0]?.user_name).toBe('Alice Cruz');
    });
});
