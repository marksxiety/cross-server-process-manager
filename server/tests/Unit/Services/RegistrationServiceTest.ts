import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('../../../src/Persistence/Connection', () => ({
    default: { beginTransaction: vi.fn() },
}));

vi.mock('../../../src/Models/User', () => ({
    User: {
        findByEmail: vi.fn(),
        createVerified: vi.fn(),
        findById: vi.fn(),
    },
}));

vi.mock('../../../src/Models/RegistrationRequest', () => ({
    RegistrationRequest: {
        upsert: vi.fn(),
        findByEmail: vi.fn(),
        findByTokenHash: vi.fn(),
        consume: vi.fn(),
        attachUser: vi.fn(),
    },
}));

vi.mock('../../../src/Auth/PasswordHasher', () => ({
    hashPassword: vi.fn(async () => 'hashed-password'),
}));

import db from '../../../src/Persistence/Connection';
import { hashPassword } from '../../../src/Auth/PasswordHasher';
import { RegistrationRequest, type RegistrationRequestRecord } from '../../../src/Models/RegistrationRequest';
import { User, type UserRecord } from '../../../src/Models/User';
import { RegistrationService } from '../../../src/Services/RegistrationService';
import type { AccessService } from '../../../src/Services/AccessService';
import type { Mailer } from '../../../src/Mail/Mailer';

const beginTransaction = db.beginTransaction as unknown as Mock;

const access = { grantDefaults: vi.fn() } as unknown as AccessService;
const mailer = { send: vi.fn() } as unknown as Mailer;
const service = new RegistrationService(access, mailer, 'https://app.test', 30);

const CREATED_AT = new Date('2026-01-01T00:00:00Z');

let session: { commit: Mock; rollback: Mock };

function user(overrides: Partial<UserRecord> = {}): UserRecord {
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

function pending(
    overrides: Partial<RegistrationRequestRecord> = {}
): RegistrationRequestRecord {
    return {
        id: 10,
        email: 'user@example.com',
        name: 'User',
        token_hash: 'hash',
        expires_at: new Date(Date.now() + 60_000),
        used_at: null,
        user_id: null,
        created_at: CREATED_AT,
        updated_at: CREATED_AT,
        ...overrides,
    };
}

function uniqueViolation(): Error & { number: number } {
    return Object.assign(
        new Error(
            "Violation of UNIQUE KEY constraint 'users_email_key'. " +
                "Cannot insert duplicate key in object 'dbo.users'."
        ),
        { number: 2627 }
    );
}

beforeEach(() => {
    session = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
    };
    beginTransaction.mockReset().mockResolvedValue(session);

    vi.mocked(User.findByEmail).mockReset();
    vi.mocked(User.createVerified).mockReset();
    vi.mocked(User.findById).mockReset();

    vi.mocked(RegistrationRequest.upsert).mockReset().mockResolvedValue(undefined);
    vi.mocked(RegistrationRequest.findByEmail).mockReset();
    vi.mocked(RegistrationRequest.findByTokenHash).mockReset();
    vi.mocked(RegistrationRequest.consume).mockReset();
    vi.mocked(RegistrationRequest.attachUser).mockReset().mockResolvedValue(undefined);

    vi.mocked(access.grantDefaults).mockReset().mockResolvedValue(undefined);
    vi.mocked(mailer.send).mockReset().mockResolvedValue(undefined);
    vi.mocked(hashPassword).mockReset().mockResolvedValue('hashed-password');

    vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('RegistrationService.request', () => {
    it('rejects a verified email', async () => {
        vi.mocked(User.findByEmail).mockResolvedValue(user());

        await expect(
            service.request({ email: 'user@example.com', name: 'User' })
        ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
        expect(RegistrationRequest.upsert).not.toHaveBeenCalled();
        expect(mailer.send).not.toHaveBeenCalled();
    });

    it('creates a pending request and sends a link', async () => {
        vi.mocked(User.findByEmail).mockResolvedValue(undefined);

        const result = await service.request({
            email: 'user@example.com',
            name: 'User',
        });

        expect(RegistrationRequest.upsert).toHaveBeenCalledWith({
            email: 'user@example.com',
            name: 'User',
            tokenHash: expect.any(String),
            ttlMinutes: 30,
        });
        expect(mailer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'user@example.com',
                subject: 'Verify your email address for XPM',
                text: expect.stringContaining('https://app.test/verify-email?token='),
                html: expect.stringContaining('https://app.test/verify-email?token='),
            })
        );
        expect(result).toEqual({ email: 'user@example.com' });
    });

    it('rejects when the verification email cannot be sent', async () => {
        vi.mocked(User.findByEmail).mockResolvedValue(undefined);
        vi.mocked(mailer.send).mockRejectedValueOnce(new Error('smtp unavailable'));

        await expect(
            service.request({ email: 'user@example.com', name: 'User' })
        ).rejects.toMatchObject({
            status: 502,
            code: 'MAIL_DELIVERY_FAILED',
        });

        expect(RegistrationRequest.upsert).toHaveBeenCalled();
    });
});

describe('RegistrationService.resend', () => {
    it('does nothing for a verified account', async () => {
        vi.mocked(User.findByEmail).mockResolvedValue(user());

        await service.resend('user@example.com');

        expect(RegistrationRequest.findByEmail).not.toHaveBeenCalled();
        expect(RegistrationRequest.upsert).not.toHaveBeenCalled();
        expect(mailer.send).not.toHaveBeenCalled();
    });

    it('reissues a link for a pending request', async () => {
        vi.mocked(User.findByEmail).mockResolvedValue(undefined);
        vi.mocked(RegistrationRequest.findByEmail).mockResolvedValue(pending());

        await service.resend('user@example.com');

        expect(RegistrationRequest.upsert).toHaveBeenCalledWith({
            email: 'user@example.com',
            name: 'User',
            tokenHash: expect.any(String),
            ttlMinutes: 30,
        });
        expect(mailer.send).toHaveBeenCalledTimes(1);
    });

    it('does nothing when no pending request exists', async () => {
        vi.mocked(User.findByEmail).mockResolvedValue(undefined);
        vi.mocked(RegistrationRequest.findByEmail).mockResolvedValue(undefined);

        await service.resend('user@example.com');

        expect(RegistrationRequest.upsert).not.toHaveBeenCalled();
        expect(mailer.send).not.toHaveBeenCalled();
    });
});

describe('RegistrationService.verify', () => {
    it('creates a verified user, grants access and links the pending row', async () => {
        vi.mocked(RegistrationRequest.consume).mockResolvedValue(pending());
        vi.mocked(User.findByEmail).mockResolvedValue(undefined);
        vi.mocked(User.createVerified).mockResolvedValue(user());

        const result = await service.verify('raw-token', 'new-password');

        expect(hashPassword).toHaveBeenCalledWith('new-password');
        expect(User.createVerified).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'user@example.com',
                name: 'User',
                password_hash: 'hashed-password',
                is_active: true,
                is_admin: false,
            }),
            session
        );
        expect(access.grantDefaults).toHaveBeenCalledWith(1, session);
        expect(RegistrationRequest.attachUser).toHaveBeenCalledWith(10, 1, session);
        expect(session.commit).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ email: 'user@example.com' });
    });

    it('attaches an existing verified user and succeeds', async () => {
        vi.mocked(RegistrationRequest.consume).mockResolvedValue(pending());
        vi.mocked(User.findByEmail).mockResolvedValue(user());

        const result = await service.verify('raw-token', 'new-password');

        expect(User.createVerified).not.toHaveBeenCalled();
        expect(RegistrationRequest.attachUser).toHaveBeenCalledWith(10, 1, session);
        expect(session.commit).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ email: 'user@example.com' });
    });

    it('reports an already-used token as idempotent success', async () => {
        vi.mocked(RegistrationRequest.consume).mockResolvedValue(undefined);
        vi.mocked(RegistrationRequest.findByTokenHash).mockResolvedValue({
            ...pending({ used_at: new Date(), user_id: 1 }),
            is_expired: 0,
        });
        vi.mocked(User.findById).mockResolvedValue(user());

        await expect(service.verify('raw-token', 'new-password')).resolves.toEqual({
            email: 'user@example.com',
        });
    });

    it('rejects a used token with no linked user', async () => {
        vi.mocked(RegistrationRequest.consume).mockResolvedValue(undefined);
        vi.mocked(RegistrationRequest.findByTokenHash).mockResolvedValue({
            ...pending({ used_at: new Date() }),
            is_expired: 0,
        });

        await expect(service.verify('raw-token', 'new-password')).rejects.toMatchObject({
            code: 'LINK_ALREADY_USED',
        });
    });

    it('rejects an expired token', async () => {
        vi.mocked(RegistrationRequest.consume).mockResolvedValue(undefined);
        vi.mocked(RegistrationRequest.findByTokenHash).mockResolvedValue({
            ...pending({ expires_at: new Date(Date.now() - 60_000) }),
            is_expired: 1,
        });

        await expect(service.verify('raw-token', 'new-password')).rejects.toMatchObject({
            code: 'LINK_EXPIRED',
        });
    });

    it('rejects an unknown token', async () => {
        vi.mocked(RegistrationRequest.consume).mockResolvedValue(undefined);
        vi.mocked(RegistrationRequest.findByTokenHash).mockResolvedValue(undefined);

        await expect(service.verify('raw-token', 'new-password')).rejects.toMatchObject({
            code: 'LINK_INVALID',
        });
    });

    it('handles a unique-email race as already registered', async () => {
        vi.mocked(RegistrationRequest.consume).mockResolvedValue(pending());
        vi.mocked(User.findByEmail)
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce(user());
        vi.mocked(User.createVerified).mockRejectedValue(uniqueViolation());
        vi.mocked(RegistrationRequest.findByTokenHash).mockResolvedValue({
            ...pending(),
            is_expired: 0,
        });

        await expect(service.verify('raw-token', 'new-password')).resolves.toEqual({
            email: 'user@example.com',
        });
        expect(session.rollback).toHaveBeenCalled();
    });
});
