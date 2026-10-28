import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/Auth/PasswordHasher', () => ({
    hashPassword: vi.fn(async () => 'new-hash'),
}));

vi.mock('../../../src/Models/User', () => ({
    User: {
        findByEmail: vi.fn(),
        updatePassword: vi.fn(),
    },
}));

import { hashPassword } from '../../../src/Auth/PasswordHasher';
import { User, type UserRecord } from '../../../src/Models/User';
import type { AuthTokenService } from '../../../src/Auth/AuthTokenService';
import { PasswordResetService } from '../../../src/Services/PasswordResetService';
import type { Mailer } from '../../../src/Mail/Mailer';

const tokens = {
    issue: vi.fn(),
    consume: vi.fn(),
    invalidate: vi.fn(),
} as unknown as AuthTokenService;

const mailer = { send: vi.fn() } as unknown as Mailer;

const service = new PasswordResetService(tokens, mailer, 'https://app.test', 30);

function user(overrides: Partial<UserRecord> = {}): UserRecord {
    return {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        password_hash: 'old-hash',
        is_admin: false,
        is_active: true,
        token_version: 0,
        email_verified_at: new Date('2026-01-01T00:00:00Z'),
        last_login_at: null,
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
    };
}

beforeEach(() => {
    vi.mocked(tokens.issue).mockReset();
    vi.mocked(tokens.consume).mockReset();
    vi.mocked(tokens.invalidate).mockReset();
    vi.mocked(mailer.send).mockReset();
    vi.mocked(User.findByEmail).mockReset();
    vi.mocked(User.updatePassword).mockReset();
    vi.mocked(hashPassword).mockReset();
    vi.mocked(hashPassword).mockResolvedValue('new-hash');
});

describe('PasswordResetService.request', () => {
    it('emails a reset link to an active account', async () => {
        vi.mocked(User.findByEmail).mockResolvedValue(user());
        vi.mocked(tokens.issue).mockResolvedValue('raw-token');

        await service.request('user@example.com');

        expect(tokens.issue).toHaveBeenCalledWith(1, 'reset');
        expect(mailer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'user@example.com',
                subject: 'Reset your XPM password',
                text: expect.stringContaining(
                    'https://app.test/reset-password?token=raw-token'
                ),
                html: expect.stringContaining(
                    'https://app.test/reset-password?token=raw-token'
                ),
            })
        );
    });

    it('does nothing for an unknown account', async () => {
        vi.mocked(User.findByEmail).mockResolvedValue(undefined);

        await service.request('nobody@example.com');

        expect(tokens.issue).not.toHaveBeenCalled();
        expect(mailer.send).not.toHaveBeenCalled();
    });

    it('does nothing for a disabled account', async () => {
        vi.mocked(User.findByEmail).mockResolvedValue(user({ is_active: false }));

        await service.request('user@example.com');

        expect(tokens.issue).not.toHaveBeenCalled();
        expect(mailer.send).not.toHaveBeenCalled();
    });
});

describe('PasswordResetService.reset', () => {
    it('hashes the new password, bumps the token version and invalidates links', async () => {
        vi.mocked(tokens.consume).mockResolvedValue({ status: 'consumed', userId: 1 });
        vi.mocked(User.updatePassword).mockResolvedValue(user());

        await service.reset('raw-token', 'new-password');

        expect(hashPassword).toHaveBeenCalledWith('new-password');
        expect(User.updatePassword).toHaveBeenCalledWith(1, 'new-hash');
        expect(tokens.invalidate).toHaveBeenCalledWith(1, 'reset');
    });

    it('rejects a reused token', async () => {
        vi.mocked(tokens.consume).mockResolvedValue({ status: 'used', userId: 1 });

        await expect(service.reset('raw-token', 'new-password')).rejects.toMatchObject({
            code: 'LINK_ALREADY_USED',
        });
        expect(User.updatePassword).not.toHaveBeenCalled();
    });

    it('rejects an expired token', async () => {
        vi.mocked(tokens.consume).mockResolvedValue({ status: 'expired', userId: 1 });

        await expect(service.reset('raw-token', 'new-password')).rejects.toMatchObject({
            code: 'LINK_EXPIRED',
        });
    });

    it('rejects an unknown token', async () => {
        vi.mocked(tokens.consume).mockResolvedValue({ status: 'invalid' });

        await expect(service.reset('raw-token', 'new-password')).rejects.toMatchObject({
            code: 'LINK_INVALID',
        });
    });
});
