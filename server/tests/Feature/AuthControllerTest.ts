import { afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('../../src/Persistence/Connection', () => ({
    default: { query: vi.fn(), beginTransaction: vi.fn() },
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
const beginTransaction = db.beginTransaction as unknown as Mock;
const SECRET = 'test-secret-that-is-longer-than-thirty-two-characters';
const tokens = new TokenService(SECRET, 3600);

const access = {
    effectiveFor: vi.fn(async (user: UserRecord) =>
        user.is_admin ? allAccess() : defaultAccess()
    ),
    publicUser: vi.fn(async (user: UserRecord) =>
        toPublicUser(user, user.is_admin ? allAccess() : defaultAccess())
    ),
    grantDefaults: vi.fn(async () => undefined),
} as unknown as AccessService;

const controller = new AuthController(new AuthService(tokens, access));

const FAST_PARAMS: ScryptParams = { N: 1024, r: 8, p: 1, keylen: 32 };
const PASSWORD = 'correct-horse-battery';
const CREATED_AT = new Date('2026-01-01T00:00:00Z');
const LOGIN_AT = new Date('2026-01-02T00:00:00Z');

let passwordHash = '';
let session: { query: Mock; commit: Mock; rollback: Mock };

function userRow(overrides: Partial<UserRecord> = {}): UserRecord {
    return {
        id: 1,
        email: 'admin@example.com',
        name: 'Admin',
        password_hash: passwordHash,
        is_admin: false,
        is_active: true,
        token_version: 0,
        email_verified_at: null,
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

function uniqueViolation(constraint: string): Error & { number: number } {
    return Object.assign(
        new Error(
            `Violation of UNIQUE KEY constraint '${constraint}'. ` +
                "Cannot insert duplicate key in object 'dbo.users'."
        ),
        { number: 2627 }
    );
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
    beginTransaction.mockReset();
    session = {
        query: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
    };
    beginTransaction.mockResolvedValue(session);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('AuthController.register', () => {
    async function register(body: unknown): Promise<MockResponse> {
        const res = createResponse();
        await invoke(controller.register, createRequest({ body }), res);
        return res;
    }

    it('creates an active non-admin account with default page grants', async () => {
        session.query.mockResolvedValueOnce({ rows: [userRow()] });
        const res = await register({
            email: ' Admin@Example.com ',
            name: ' Admin ',
            password: PASSWORD,
        });

        expect(res.status).not.toHaveBeenCalled();
        const body = authBody(res);
        expect(body.success).toBe(true);
        expect(body.message).toBe('Registration successful');
        expect(body.info.token_type).toBe('Bearer');
        expect(body.info.expires_in).toBe(3600);
        expect(tokens.verify(body.info.token)).toEqual({
            userId: 1,
            tokenVersion: 0,
        });
        expect(body.info.user).toMatchObject({
            is_admin: false,
            pages: ['dashboard', 'server_metrics'],
            events: [],
        });
        expect(body.info.user).not.toHaveProperty('password_hash');
        expect(body.info.user).not.toHaveProperty('token_version');

        const [sql, params] = session.query.mock.calls[0] as [string, unknown[]];
        expect(sql).toContain('INSERT INTO users');
        expect(sql).toContain('OUTPUT INSERTED.*');
        expect(params[0]).toBe('admin@example.com');
        expect(params[1]).toBe('Admin');
        expect(String(params[2])).toMatch(/^scrypt\$16384\$8\$1\$/);
        expect(params[3]).toBe(true);
        expect(params[4]).toBe(false);
        expect(session.commit).toHaveBeenCalledTimes(1);
        expect(access.grantDefaults).toHaveBeenCalledWith(1, session);
    });

    it('ignores client-supplied is_active and is_admin', async () => {
        session.query.mockResolvedValueOnce({ rows: [userRow()] });

        await register({
            email: 'admin@example.com',
            name: 'Admin',
            password: PASSWORD,
            is_active: false,
            is_admin: true,
        });

        const [, params] = session.query.mock.calls[0] as [string, unknown[]];
        expect(params[3]).toBe(true);
        expect(params[4]).toBe(false);
    });

    it('responds 409 EMAIL_TAKEN when the email constraint is violated', async () => {
        session.query.mockRejectedValueOnce(uniqueViolation('users_email_key'));
        const res = await register({
            email: 'admin@example.com',
            name: 'Admin',
            password: PASSWORD,
        });

        expect(res.status).toHaveBeenCalledWith(409);
        const body = responseBody(res);
        expect(body.code).toBe('EMAIL_TAKEN');
        expect(body.message).toBe('An account with this email already exists');
    });

    it('responds 400 with field errors and skips the database for an invalid payload', async () => {
        const res = await register({
            email: 'not-an-email',
            name: '',
            password: 'short',
        });

        expect(res.status).toHaveBeenCalledWith(400);
        const body = responseBody(res);
        expect(body.code).toBe('VALIDATION_FAILED');
        const errors = body.info as Record<string, string[]>;
        expect(errors.email).toContain('Email must be a valid email address');
        expect(errors.name).toContain('Name is required');
        expect(errors.password).toContain('Password must be at least 8 characters');
        expect(beginTransaction).not.toHaveBeenCalled();
        expect(query).not.toHaveBeenCalled();
    });

    it('responds 500 when the insert fails and rolls back', async () => {
        session.query.mockRejectedValueOnce(new Error('connection terminated'));
        const res = await register({
            email: 'admin@example.com',
            name: 'Admin',
            password: PASSWORD,
        });

        expect(res.status).toHaveBeenCalledWith(500);
        expect(responseBody(res).code).toBe('INTERNAL_SERVER_ERROR');
        expect(session.rollback).toHaveBeenCalledTimes(1);
    });

    it('responds 500 when the insert returns no row', async () => {
        session.query.mockResolvedValueOnce({ rows: [] });
        const res = await register({
            email: 'admin@example.com',
            name: 'Admin',
            password: PASSWORD,
        });

        expect(res.status).toHaveBeenCalledWith(500);
        expect(session.rollback).toHaveBeenCalledTimes(1);
    });
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
