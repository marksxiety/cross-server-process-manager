import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/Models/User', () => ({
    User: {
        all: vi.fn(),
        findById: vi.fn(),
        updateAdmin: vi.fn(),
    },
}));

import { User, type UserRecord } from '../../../src/Models/User';
import { HttpException } from '../../../src/Exceptions/HttpException';
import type { AccessService } from '../../../src/Services/AccessService';
import { AdminService } from '../../../src/Services/AdminService';

const CREATED_AT = new Date('2026-01-01T00:00:00Z');
const ENV_EMAIL = 'env-admin@example.com';

function userRow(overrides: Partial<UserRecord> = {}): UserRecord {
    return {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        password_hash: 'hash',
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

const accessFns = {
    allGrants: vi.fn(),
    grantsFor: vi.fn(),
    replaceGrants: vi.fn(),
};
const access = accessFns as unknown as AccessService;
const service = new AdminService(access, ENV_EMAIL);

beforeEach(() => {
    vi.mocked(User.all).mockReset();
    vi.mocked(User.findById).mockReset();
    vi.mocked(User.updateAdmin).mockReset();
    accessFns.allGrants.mockReset();
    accessFns.grantsFor.mockReset();
    accessFns.replaceGrants.mockReset();
});

describe('AdminService', () => {
    it('lists users with their stored grants', async () => {
        vi.mocked(User.all).mockResolvedValue([
            userRow(),
            userRow({ id: 2, email: ENV_EMAIL, name: 'Env Admin', is_admin: true }),
        ]);
        accessFns.allGrants.mockResolvedValue(
            new Map([[1, { pages: ['server_metrics'], events: ['process.start'] }]])
        );

        const users = await service.listUsers();

        expect(users).toHaveLength(2);
        expect(users[0]).toMatchObject({
            id: 1,
            is_env_admin: false,
            pages: ['server_metrics'],
            events: ['process.start'],
        });
        expect(users[1]).toMatchObject({
            id: 2,
            is_admin: true,
            is_env_admin: true,
            pages: [],
            events: [],
        });
    });

    it('updates a regular user and returns the refreshed grants', async () => {
        vi.mocked(User.findById).mockResolvedValue(userRow());
        vi.mocked(User.updateAdmin).mockResolvedValue(
            userRow({ name: 'Renamed', is_admin: true })
        );
        accessFns.grantsFor.mockResolvedValue({
            pages: ['server_metrics'],
            events: ['process.delete'],
        });

        const updated = await service.updateUser(1, {
            name: 'Renamed',
            is_admin: true,
        });

        expect(User.updateAdmin).toHaveBeenCalledWith(1, {
            email: 'user@example.com',
            name: 'Renamed',
            is_active: true,
            is_admin: true,
        });
        expect(updated.name).toBe('Renamed');
        expect(updated.is_admin).toBe(true);
        expect(updated.events).toEqual(['process.delete']);
    });

    it('refuses to modify the ENV admin', async () => {
        vi.mocked(User.findById).mockResolvedValue(
            userRow({ id: 2, email: ENV_EMAIL, is_admin: true })
        );

        await expect(service.updateUser(2, { name: 'Nope' })).rejects.toMatchObject({
            status: 403,
            code: 'ENV_ADMIN_PROTECTED',
        });
        expect(User.updateAdmin).not.toHaveBeenCalled();
    });

    it('refuses to replace ENV admin grants', async () => {
        vi.mocked(User.findById).mockResolvedValue(
            userRow({ id: 2, email: ENV_EMAIL, is_admin: true })
        );

        await expect(service.replaceAccess(2, ['servers'], ['server.create'])).rejects.toBeInstanceOf(
            HttpException
        );
        expect(accessFns.replaceGrants).not.toHaveBeenCalled();
    });

    it('replaces grants for a regular user', async () => {
        vi.mocked(User.findById).mockResolvedValue(userRow());
        accessFns.grantsFor.mockResolvedValue({
            pages: ['servers'],
            events: ['server.create'],
        });

        const updated = await service.replaceAccess(1, ['servers'], ['server.create']);

        expect(accessFns.replaceGrants).toHaveBeenCalledWith(
            1,
            ['servers'],
            ['server.create']
        );
        expect(updated.pages).toEqual(['servers']);
        expect(updated.events).toEqual(['server.create']);
    });
});
