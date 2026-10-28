import type { NextFunction, Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('../../../../src/Persistence/Connection', () => ({
    default: { query: vi.fn() },
}));

import db from '../../../../src/Persistence/Connection';
import { TokenService } from '../../../../src/Auth/TokenService';
import { HttpException } from '../../../../src/Exceptions/HttpException';
import { authenticate } from '../../../../src/Http/Middleware/Authenticate';
import { toPublicUser, type UserRecord } from '../../../../src/Models/User';
import { defaultAccess } from '../../../../src/Security/AccessCatalog';
import type { AccessService } from '../../../../src/Services/AccessService';
import { AuthService } from '../../../../src/Services/AuthService';

const query = db.query as unknown as Mock;
const SECRET = 'test-secret-that-is-longer-than-thirty-two-characters';

const USER_ROW: UserRecord = {
    id: 1,
    email: 'admin@example.com',
    name: 'Admin',
    password_hash: 'scrypt$1024$8$1$c2FsdA$aGFzaA',
    is_admin: false,
    is_active: true,
    token_version: 0,
    email_verified_at: new Date('2026-01-01T00:00:00Z'),
    last_login_at: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
};

const access = {
    publicUser: vi.fn(async (user: UserRecord) => toPublicUser(user, defaultAccess())),
} as unknown as AccessService;

const tokens = new TokenService(SECRET, 3600);
const middleware = authenticate(tokens, new AuthService(tokens, access));

function requestWith(authorization: string | undefined): Request {
    return {
        header: (name: string) =>
            name.toLowerCase() === 'authorization' ? authorization : undefined,
    } as unknown as Request;
}

async function run(authorization: string | undefined): Promise<{
    locals: Record<string, unknown>;
    next: Mock;
}> {
    const res = { locals: {} as Record<string, unknown> };
    const next = vi.fn();

    await middleware(
        requestWith(authorization),
        res as unknown as Response,
        next as unknown as NextFunction
    );

    return { locals: res.locals, next };
}

function bearer(service: TokenService): string {
    return `Bearer ${service.sign({ id: 1, tokenVersion: 0 }).token}`;
}

function httpError(next: Mock): HttpException {
    const error = next.mock.calls[0]?.[0];
    if (!(error instanceof HttpException)) {
        throw new Error('Expected HttpException');
    }
    return error;
}

beforeEach(() => {
    query.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('authenticate', () => {
    it('rejects a missing Authorization header', async () => {
        const { next } = await run(undefined);

        expect(httpError(next).status).toBe(401);
        expect(httpError(next).code).toBe('UNAUTHORIZED');
        expect(query).not.toHaveBeenCalled();
    });

    it('rejects a non-Bearer Authorization header', async () => {
        const { next } = await run('Basic abc');

        expect(httpError(next).code).toBe('UNAUTHORIZED');
        expect(query).not.toHaveBeenCalled();
    });

    it('rejects an invalid token', async () => {
        const { next } = await run('Bearer not-a-token');

        expect(httpError(next).code).toBe('INVALID_TOKEN');
        expect(query).not.toHaveBeenCalled();
    });

    it('reports an expired token', async () => {
        const expired = new TokenService(SECRET, -1).sign({
            id: 1,
            tokenVersion: 0,
        }).token;

        const { next } = await run(`Bearer ${expired}`);

        expect(httpError(next).code).toBe('TOKEN_EXPIRED');
    });

    it('rejects a token whose user no longer exists', async () => {
        query.mockResolvedValueOnce({ rows: [] });

        const { next } = await run(bearer(tokens));

        expect(httpError(next).code).toBe('UNAUTHORIZED');
        expect(query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = @p1', [1]);
    });

    it('rejects a deactivated user', async () => {
        query.mockResolvedValueOnce({ rows: [{ ...USER_ROW, is_active: false }] });

        const { next } = await run(bearer(tokens));

        expect(httpError(next).code).toBe('UNAUTHORIZED');
    });

    it('rejects a token issued before the token version changed', async () => {
        query.mockResolvedValueOnce({ rows: [{ ...USER_ROW, token_version: 2 }] });

        const { next } = await run(bearer(tokens));

        expect(httpError(next).code).toBe('UNAUTHORIZED');
    });

    it('rejects an unverified user', async () => {
        query.mockResolvedValueOnce({ rows: [{ ...USER_ROW, email_verified_at: null }] });

        const { next } = await run(bearer(tokens));

        expect(httpError(next).code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('attaches the public user and continues for a valid token', async () => {
        query.mockResolvedValueOnce({ rows: [USER_ROW] });

        const { locals, next } = await run(bearer(tokens));

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0]).toHaveLength(0);
        expect(locals.user).toEqual(toPublicUser(USER_ROW, defaultAccess()));
        expect(locals.user).not.toHaveProperty('password_hash');
        expect(locals.user).not.toHaveProperty('token_version');
    });

    it('forwards database failures', async () => {
        query.mockRejectedValueOnce(new Error('connection terminated'));

        const { next } = await run(bearer(tokens));

        expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
        expect(next.mock.calls[0]?.[0]).not.toBeInstanceOf(HttpException);
    });
});
