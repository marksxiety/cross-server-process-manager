import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('../../../src/Persistence/Connection', () => ({
    default: { query: vi.fn(), beginTransaction: vi.fn() },
}));

import db from '../../../src/Persistence/Connection';
import {
    AuthTokenService,
    generateAuthToken,
    hashAuthToken,
} from '../../../src/Auth/AuthTokenService';

const query = db.query as unknown as Mock;
const beginTransaction = db.beginTransaction as unknown as Mock;

let session: { query: Mock; commit: Mock; rollback: Mock };

beforeEach(() => {
    query.mockReset();
    beginTransaction.mockReset();
    session = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
    };
    beginTransaction.mockResolvedValue(session);
});

describe('auth token helpers', () => {
    it('generates distinct url-safe tokens', () => {
        const first = generateAuthToken();
        const second = generateAuthToken();

        expect(first).not.toBe(second);
        expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(first.length).toBeGreaterThan(30);
    });

    it('hashes tokens deterministically', () => {
        expect(hashAuthToken('abc')).toBe(hashAuthToken('abc'));
        expect(hashAuthToken('abc')).not.toBe(hashAuthToken('abd'));
        expect(hashAuthToken('abc')).toMatch(/^[a-f0-9]{64}$/);
    });
});

describe('AuthTokenService.issue', () => {
    it('invalidates prior tokens and stores only the hash', async () => {
        const service = new AuthTokenService(30);

        const token = await service.issue(7, 'reset', '127.0.0.1');

        expect(session.query).toHaveBeenCalledTimes(2);
        const [invalidateSql, invalidateParams] = session.query.mock.calls[0] as [
            string,
            unknown[],
        ];
        expect(invalidateSql).toContain('UPDATE auth_tokens');
        expect(invalidateParams).toEqual([7, 'reset']);

        const [insertSql, insertParams] = session.query.mock.calls[1] as [
            string,
            unknown[],
        ];
        expect(insertSql).toContain('INSERT INTO auth_tokens');
        expect(insertSql).toContain('DATEADD(MINUTE, @p4, SYSDATETIME())');
        expect(insertParams[0]).toBe(7);
        expect(insertParams[1]).toBe('reset');
        expect(insertParams[2]).toBe(hashAuthToken(token));
        expect(insertParams[2]).not.toBe(token);
        expect(insertParams[3]).toBe(30);
        expect(insertParams[4]).toBe('127.0.0.1');
        expect(session.commit).toHaveBeenCalledTimes(1);
    });
});

describe('AuthTokenService.consume', () => {
    const service = new AuthTokenService(30);

    it('reports a consumed token', async () => {
        query.mockResolvedValueOnce({ rows: [{ user_id: 7 }] });

        await expect(service.consume('raw', 'reset')).resolves.toEqual({
            status: 'consumed',
            userId: 7,
        });
    });

    it('reports a reused token', async () => {
        query.mockResolvedValueOnce({ rows: [] });
        query.mockResolvedValueOnce({
            rows: [{ user_id: 7, used_at: new Date(), is_expired: 0 }],
        });

        await expect(service.consume('raw', 'reset')).resolves.toEqual({
            status: 'used',
            userId: 7,
        });
    });

    it('reports an expired token', async () => {
        query.mockResolvedValueOnce({ rows: [] });
        query.mockResolvedValueOnce({
            rows: [{ user_id: 7, used_at: null, is_expired: 1 }],
        });

        await expect(service.consume('raw', 'reset')).resolves.toEqual({
            status: 'expired',
            userId: 7,
        });
    });

    it('reports an unknown token', async () => {
        query.mockResolvedValueOnce({ rows: [] });
        query.mockResolvedValueOnce({ rows: [] });

        await expect(service.consume('raw', 'reset')).resolves.toEqual({
            status: 'invalid',
        });
    });

    it('uses the atomic conditional update', async () => {
        query.mockResolvedValueOnce({ rows: [] });
        query.mockResolvedValueOnce({ rows: [] });

        await service.consume('raw', 'reset');

        const [sql, params] = query.mock.calls[0] as [string, unknown[]];
        expect(sql).toContain('used_at IS NULL');
        expect(sql).toContain('expires_at > SYSDATETIME()');
        expect(params).toEqual([hashAuthToken('raw'), 'reset']);
    });
});
