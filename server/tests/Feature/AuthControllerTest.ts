import { afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('../../src/Persistence/Connection', () => ({
    default: { query: vi.fn() },
}));

import db from '../../src/Persistence/Connection';
import { TokenService } from '../../src/Auth/TokenService';
import { hashPassword, type ScryptParams } from '../../src/Auth/PasswordHasher';
import { AuthController } from '../../src/Http/Controllers/AuthController';
import { toPublicUser, type PublicUser, type UserRecord } from '../../src/Models/User';
import { allAccess, defaultAccess } from '../../src/Security/AccessCatalog';
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
const SECRET = 'test-secret-that-is-longer-than-thirty-two-characters';
const tokens = new TokenService(SECRET, 3600);

const access = {
    effectiveFor: vi.fn(async (user: UserRecord) =>
        user.is_admin ? allAccess() : defaultAccess()
    ),
    publicUser: vi.fn(async (user: UserRecord) =>
        toPublicUser(user, user.is_admin ? allAccess() : defaultAccess())
    ),
} as unknown as AccessService;

const controller = new AuthController(new AuthService(tokens, access));

const FAST_PARAMS: ScryptParams = { N: 1024, r: 8, p: 1, keylen: 32 };
const PASSWORD = 'correct-horse-battery';
const CREATED_AT = new Date('2026-01-01T00:00:00Z');
const LOGIN_AT = new Date('2026-01-02T00:00:00Z');

let passwordHash = '';

function userRow(overrides: Partial<UserRecord> = {}): UserRecord {
    return {
        id: 1,
        email: 'admin@example.com',
        name: 'Admin',
        password_hash: passwordHash,
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

interface AuthBody {
    success: boolean;
    message: string;
    code?: string;
    info: {
        token: string;
        token_type: string;
        expires_in: number;
        user: Record<string, unknown>;
    };
}

function authBody(res: MockResponse): AuthBody {
    return responseBody(res) as unknown as AuthBody;
}

function responseWithUser(user?: PublicUser): MockResponse {
    const res = createResponse();
    (res as unknown as { locals: Record<string, unknown> }).locals = user ? { user } : {};
    return res;
}

beforeAll(async () => {
    passwordHash = await hashPassword(PASSWORD, FAST_PARAMS);
});

beforeEach(() => {
    query.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('AuthController.login', () => {
    async function login(body: unknown): Promise<MockResponse> {
        const res = createResponse();
        await invoke(controller.login, createRequest({ body }), res);
        return res;
    }

    it('verifies the password, refreshes last_login_at and returns a token', async () => {
        query.mockResolvedValueOnce({ rows: [userRow()] });
        query.mockResolvedValueOnce({
            rows: [userRow({ last_login_at: LOGIN_AT, updated_at: LOGIN_AT })],
        });
        const res = await login({
            email: ' Admin@Example.com ',
            password: PASSWORD,
        });

        expect(res.status).not.toHaveBeenCalled();
        const body = authBody(res);
        expect(body.message).toBe('Login successful');
        expect(tokens.verify(body.info.token)).toEqual({
            userId: 1,
            tokenVersion: 0,
        });
        expect(body.info.user).toMatchObject({
            is_admin: false,
            pages: ['dashboard', 'server_metrics'],
            events: [],
        });

        const [selectSql, selectParams] = query.mock.calls[0] as [string, unknown[]];
        expect(selectSql).toContain('SELECT * FROM users WHERE email = @p1');
        expect(selectParams[0]).toBe('admin@example.com');

        const [updateSql, updateParams] = query.mock.calls[1] as [string, unknown[]];
        expect(updateSql).toContain('last_login_at = SYSDATETIME()');
        expect(updateSql).toContain('OUTPUT INSERTED.*');
        expect(updateParams).toEqual([1]);
    });

    it('responds 401 INVALID_CREDENTIALS for an unknown email without leaking it', async () => {
        query.mockResolvedValueOnce({ rows: [] });
        const res = await login({
            email: 'nobody@example.com',
            password: PASSWORD,
        });

        expect(res.status).toHaveBeenCalledWith(401);
        expect(responseBody(res).code).toBe('INVALID_CREDENTIALS');
        expect(responseBody(res).message).toBe('Invalid email or password');
        expect(query).toHaveBeenCalledTimes(1);
    });

    it('responds 401 INVALID_CREDENTIALS for a wrong password', async () => {
        query.mockResolvedValueOnce({ rows: [userRow()] });
        const res = await login({
            email: 'admin@example.com',
            password: 'wrong-password',
        });

        expect(res.status).toHaveBeenCalledWith(401);
        expect(responseBody(res).code).toBe('INVALID_CREDENTIALS');
        expect(query).toHaveBeenCalledTimes(1);
    });

    it('responds 403 ACCOUNT_DISABLED only after the password matches', async () => {
        query.mockResolvedValueOnce({ rows: [userRow({ is_active: false })] });
        const res = await login({
            email: 'admin@example.com',
            password: PASSWORD,
        });

        expect(res.status).toHaveBeenCalledWith(403);
        expect(responseBody(res).code).toBe('ACCOUNT_DISABLED');
        expect(query).toHaveBeenCalledTimes(1);
    });

    it('responds 403 EMAIL_NOT_VERIFIED for an unverified account', async () => {
        query.mockResolvedValueOnce({ rows: [userRow({ email_verified_at: null })] });
        const res = await login({
            email: 'admin@example.com',
            password: PASSWORD,
        });

        expect(res.status).toHaveBeenCalledWith(403);
        expect(responseBody(res).code).toBe('EMAIL_NOT_VERIFIED');
        expect(query).toHaveBeenCalledTimes(1);
    });

    it('responds 500 when the lookup fails', async () => {
        query.mockRejectedValueOnce(new Error('connection terminated'));
        const res = await login({
            email: 'admin@example.com',
            password: PASSWORD,
        });

        expect(res.status).toHaveBeenCalledWith(500);
        expect(responseBody(res).code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('responds 500 when refreshing last_login_at fails', async () => {
        query.mockResolvedValueOnce({ rows: [userRow()] });
        query.mockRejectedValueOnce(new Error('connection terminated'));
        const res = await login({
            email: 'admin@example.com',
            password: PASSWORD,
        });

        expect(res.status).toHaveBeenCalledWith(500);
        expect(responseBody(res).code).toBe('INTERNAL_SERVER_ERROR');
    });
});

describe('AuthController.logout', () => {
    it('bumps the token version so every issued token is revoked', async () => {
        query.mockResolvedValueOnce({ rows: [userRow({ token_version: 1 })] });
        const user = toPublicUser(userRow(), defaultAccess());
        const res = responseWithUser(user);

        await invoke(controller.logout, createRequest({}), res);

        expect(res.status).not.toHaveBeenCalled();
        expect(responseBody(res).message).toBe('Signed out successfully');
        const [sql, params] = query.mock.calls[0] as [string, unknown[]];
        expect(sql).toContain('token_version = token_version + 1');
        expect(params).toEqual([1]);
    });

    it('responds 401 when the middleware did not attach a user', async () => {
        const res = responseWithUser();

        await invoke(controller.logout, createRequest({}), res);

        expect(res.status).toHaveBeenCalledWith(401);
    });
});

describe('AuthController.me', () => {
    it('responds with the user attached by the middleware', async () => {
        const user = toPublicUser(userRow(), defaultAccess());
        const res = responseWithUser(user);

        await invoke(controller.me, createRequest({}), res);

        expect(res.status).not.toHaveBeenCalled();
        expect(responseBody(res)).toEqual({
            success: true,
            message: 'Authenticated user retrieved',
            info: user,
        });
    });

    it('responds 401 when the middleware did not attach a user', async () => {
        const res = responseWithUser();

        await invoke(controller.me, createRequest({}), res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(responseBody(res).code).toBe('UNAUTHORIZED');
    });
});
