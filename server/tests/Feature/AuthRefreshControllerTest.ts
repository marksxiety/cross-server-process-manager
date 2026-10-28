import { afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('../../src/Persistence/Connection', () => ({
    default: { query: vi.fn(), beginTransaction: vi.fn() },
}));

vi.mock('../../src/Services/AuditService', () => ({
    auditAfter: vi.fn(),
    recordAudit: vi.fn(),
}));

import db from '../../src/Persistence/Connection';
import { TokenService } from '../../src/Auth/TokenService';
import { AuthController } from '../../src/Http/Controllers/AuthController';
import { toPublicUser, type UserRecord } from '../../src/Models/User';
import type { RefreshTokenLookup } from '../../src/Models/RefreshToken';
import { defaultAccess } from '../../src/Security/AccessCatalog';
import type { AccessService } from '../../src/Services/AccessService';
import { AuthService } from '../../src/Services/AuthService';
import {
    createRequest,
    createResponse,
    invoke,
    responseBody,
    type MockResponse,
} from '../Support/Http';

const query = db.query as unknown as Mock;
const beginTransaction = db.beginTransaction as unknown as Mock;
const SECRET = 'test-secret-that-is-longer-than-thirty-two-characters';
const TTL_DAYS = 30;
const GRACE_SECONDS = 30;
const tokens = new TokenService(SECRET, 3600);

const access = {
    effectiveFor: vi.fn(async (user: UserRecord) => defaultAccess()),
    publicUser: vi.fn(async (user: UserRecord) => toPublicUser(user, defaultAccess())),
} as unknown as AccessService;

const service = new AuthService(tokens, access, TTL_DAYS, GRACE_SECONDS);
const controller = new AuthController(service);

const CREATED_AT = new Date('2026-01-01T00:00:00Z');
const USED_AT = new Date('2026-01-02T00:00:00Z');

function userRow(overrides: Partial<UserRecord> = {}): UserRecord {
    return {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        password_hash: 'hash',
        is_admin: false,
        is_active: true,
        token_version: 0,
        email_verified_at: CREATED_AT,
        last_login_at: null,
        created_at: CREATED_AT,
        updated_at: CREATED_AT,
        ...overrides,
    };
}

function tokenRow(overrides: Partial<RefreshTokenLookup> = {}): RefreshTokenLookup {
    return {
        id: 1,
        user_id: 1,
        token_hash: 'hash',
        family_id: 'family-1',
        token_version: 0,
        expires_at: new Date('2026-02-01T00:00:00Z'),
        used_at: null,
        created_at: CREATED_AT,
        is_expired: 0,
        is_reuse: 0,
        ...overrides,
    };
}

interface RefreshBody {
    success: boolean;
    message: string;
    code?: string;
    info: {
        token: string;
        token_type: string;
        expires_in: number;
        refresh_token: string;
        refresh_expires_in: number;
        user: Record<string, unknown>;
    } | null;
}

function body(res: MockResponse): RefreshBody {
    return responseBody(res) as unknown as RefreshBody;
}

async function refresh(payload: unknown): Promise<MockResponse> {
    const res = createResponse();
    await invoke(controller.refresh, createRequest({ body: payload }), res);
    return res;
}

function mockRotatingSession(): { query: Mock; commit: Mock; rollback: Mock } {
    const session = {
        query: vi.fn().mockResolvedValueOnce({ rows: [tokenRow()], rowCount: 1 }),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
    };
    beginTransaction.mockResolvedValueOnce(session);
    return session;
}

beforeEach(() => {
    query.mockReset();
    beginTransaction.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('POST /auth/refresh', () => {
    it('rotates the token and returns a new access/refresh pair', async () => {
        query.mockResolvedValueOnce({ rows: [tokenRow()] });
        query.mockResolvedValueOnce({ rows: [userRow()] });
        const session = mockRotatingSession();
        query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const res = await refresh({ refresh_token: 'raw-refresh-token' });

        expect(res.status).not.toHaveBeenCalled();
        const payload = body(res);
        expect(payload.message).toBe('Session refreshed');
        expect(tokens.verify(payload.info!.token)).toEqual({ userId: 1, tokenVersion: 0 });
        expect(payload.info!.refresh_token).not.toBe('raw-refresh-token');
        expect(payload.info!.refresh_expires_in).toBe(TTL_DAYS * 24 * 60 * 60);
        expect(payload.info!.user).toMatchObject({ id: 1, email: 'user@example.com' });
        expect(session.commit).toHaveBeenCalled();
        expect(session.rollback).not.toHaveBeenCalled();

        const [, consumeParams] = session.query.mock.calls[0] as [string, unknown[]];
        expect(consumeParams).toEqual([expect.stringMatching(/^[a-f0-9]{64}$/)]);
    });

    it('rejects an unknown refresh token', async () => {
        query.mockResolvedValueOnce({ rows: [] });

        const res = await refresh({ refresh_token: 'unknown' });

        expect(res.status).toHaveBeenCalledWith(401);
        expect(responseBody(res).code).toBe('INVALID_REFRESH_TOKEN');
        expect(beginTransaction).not.toHaveBeenCalled();
    });

    it('rejects an expired refresh token', async () => {
        query.mockResolvedValueOnce({ rows: [tokenRow({ is_expired: 1 })] });

        const res = await refresh({ refresh_token: 'expired' });

        expect(res.status).toHaveBeenCalledWith(401);
        expect(responseBody(res).code).toBe('REFRESH_TOKEN_EXPIRED');
    });

    it('asks the client to retry when a concurrent rotation is in flight', async () => {
        query.mockResolvedValueOnce({ rows: [tokenRow({ used_at: USED_AT, is_reuse: 0 })] });

        const res = await refresh({ refresh_token: 'racing' });

        expect(res.status).toHaveBeenCalledWith(401);
        expect(responseBody(res).code).toBe('REFRESH_IN_PROGRESS');
        expect(query).toHaveBeenCalledTimes(1);
    });

    it('revokes the family when a rotated token is reused after the grace window', async () => {
        query.mockResolvedValueOnce({ rows: [tokenRow({ used_at: USED_AT, is_reuse: 1 })] });
        query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

        const res = await refresh({ refresh_token: 'stolen' });

        expect(res.status).toHaveBeenCalledWith(401);
        expect(responseBody(res).code).toBe('REFRESH_TOKEN_REUSED');
        const [sql, params] = query.mock.calls[1] as [string, unknown[]];
        expect(sql).toContain('UPDATE refresh_tokens');
        expect(sql).toContain('family_id = @p1');
        expect(params).toEqual(['family-1']);
    });

    it('rejects a token issued before the account version changed', async () => {
        query.mockResolvedValueOnce({ rows: [tokenRow({ token_version: 0 })] });
        query.mockResolvedValueOnce({ rows: [userRow({ token_version: 1 })] });

        const res = await refresh({ refresh_token: 'stale' });

        expect(res.status).toHaveBeenCalledWith(401);
        expect(responseBody(res).code).toBe('INVALID_REFRESH_TOKEN');
        expect(beginTransaction).not.toHaveBeenCalled();
    });

    it('rejects a disabled account', async () => {
        query.mockResolvedValueOnce({ rows: [tokenRow()] });
        query.mockResolvedValueOnce({ rows: [userRow({ is_active: false })] });

        const res = await refresh({ refresh_token: 'valid' });

        expect(res.status).toHaveBeenCalledWith(403);
        expect(responseBody(res).code).toBe('ACCOUNT_DISABLED');
    });

    it('rejects an unverified account', async () => {
        query.mockResolvedValueOnce({ rows: [tokenRow()] });
        query.mockResolvedValueOnce({ rows: [userRow({ email_verified_at: null })] });

        const res = await refresh({ refresh_token: 'valid' });

        expect(res.status).toHaveBeenCalledWith(403);
        expect(responseBody(res).code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('reports in-progress when another request wins the rotation race', async () => {
        query.mockResolvedValueOnce({ rows: [tokenRow()] });
        query.mockResolvedValueOnce({ rows: [userRow()] });
        const session = {
            query: vi.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 }),
            commit: vi.fn(),
            rollback: vi.fn().mockResolvedValue(undefined),
        };
        beginTransaction.mockResolvedValueOnce(session);
        query.mockResolvedValueOnce({ rows: [tokenRow({ used_at: USED_AT, is_reuse: 0 })] });

        const res = await refresh({ refresh_token: 'racing' });

        expect(res.status).toHaveBeenCalledWith(401);
        expect(responseBody(res).code).toBe('REFRESH_IN_PROGRESS');
        expect(session.rollback).toHaveBeenCalled();
        expect(session.commit).not.toHaveBeenCalled();
    });

    it('rejects a payload without a refresh token', async () => {
        const res = await refresh({ refresh_token: '' });

        expect(res.status).toHaveBeenCalledWith(400);
        expect(responseBody(res).code).toBe('VALIDATION_FAILED');
        expect(query).not.toHaveBeenCalled();
    });

    it('responds 500 when the lookup fails', async () => {
        query.mockRejectedValueOnce(new Error('connection terminated'));

        const res = await refresh({ refresh_token: 'valid' });

        expect(res.status).toHaveBeenCalledWith(500);
        expect(responseBody(res).code).toBe('INTERNAL_SERVER_ERROR');
    });
});
