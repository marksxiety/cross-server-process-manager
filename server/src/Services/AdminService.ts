import { loadAdminConfig } from '../../config/admin';
import { DuplicateResourceException } from '../Exceptions/DuplicateResourceException';
import { HttpException } from '../Exceptions/HttpException';
import { NotFoundException } from '../Exceptions/NotFoundException';
import { User, type UserRecord } from '../Models/User';
import { describeDbError, isUniqueViolation } from '../Persistence/DatabaseError';
import { databaseException } from '../Persistence/DbException';
import {
    ALL_PAGE_KEYS,
    DEFAULT_EVENT_KEYS,
    DEFAULT_PAGE_KEYS,
    EVENT_KEYS,
    EVENT_NAMES,
    GUEST_PAGE_KEYS,
    IMPLICIT_PAGE_KEY,
    PAGE_EVENTS,
    PAGE_NAMES,
    type EventKey,
    type PageKey,
    type UserAccess,
} from '../Security/AccessCatalog';
import { AccessService } from './AccessService';

const EMAIL_TAKEN_CODE = 'EMAIL_TAKEN';
const EMAIL_TAKEN_MESSAGE = 'An account with this email already exists';
const ENV_ADMIN_PROTECTED_CODE = 'ENV_ADMIN_PROTECTED';

export interface AdminUserUpdate {
    name?: string | undefined;
    email?: string | undefined;
    is_active?: boolean | undefined;
    is_admin?: boolean | undefined;
}

export interface AdminUserView {
    id: number;
    email: string;
    name: string;
    is_active: boolean;
    is_admin: boolean;
    is_env_admin: boolean;
    email_verified_at: Date | null;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
    pages: PageKey[];
    events: EventKey[];
}

export class AdminService {
    private readonly envAdminEmail: string;

    constructor(
        private readonly access: AccessService,
        envAdminEmail: string = loadAdminConfig().email
    ) {
        this.envAdminEmail = envAdminEmail;
    }

    async listUsers(): Promise<AdminUserView[]> {
        let users: UserRecord[];
        let grants: Map<number, UserAccess>;
        try {
            [users, grants] = await Promise.all([User.all(), this.access.allGrants()]);
        } catch (error) {
            throw databaseException(error, 'Failed to retrieve users');
        }

        return users.map((user) =>
            this.toView(user, grants.get(user.id) ?? { pages: [], events: [] })
        );
    }

    catalog(): Record<string, unknown> {
        return {
            implicit_page: IMPLICIT_PAGE_KEY,
            guest_pages: GUEST_PAGE_KEYS,
            default_pages: DEFAULT_PAGE_KEYS,
            default_events: DEFAULT_EVENT_KEYS,
            pages: ALL_PAGE_KEYS.map((key) => ({
                key,
                name: PAGE_NAMES[key],
                events: PAGE_EVENTS[key].map((event) => ({
                    key: event,
                    name: EVENT_NAMES[event],
                })),
            })),
            events: EVENT_KEYS.map((key) => ({
                key,
                name: EVENT_NAMES[key],
            })),
        };
    }

    async updateUser(id: number, data: AdminUserUpdate): Promise<AdminUserView> {
        const user = await this.requireUser(id);
        if (this.isEnvAdmin(user)) {
            throw new HttpException(
                403,
                'The environment admin account cannot be modified',
                ENV_ADMIN_PROTECTED_CODE
            );
        }

        let updated: UserRecord | undefined;
        try {
            updated = await User.updateAdmin(id, {
                email: data.email ?? user.email,
                name: data.name ?? user.name,
                is_active: data.is_active ?? user.is_active,
                is_admin: data.is_admin ?? user.is_admin,
            });

            if (updated && data.is_active === false) {
                updated = (await User.bumpTokenVersion(id)) ?? updated;
            }
        } catch (error) {
            if (isUniqueViolation(describeDbError(error))) {
                throw new DuplicateResourceException(EMAIL_TAKEN_MESSAGE, EMAIL_TAKEN_CODE);
            }
            throw databaseException(error, 'Failed to update user');
        }

        if (!updated) {
            throw new NotFoundException('User');
        }

        return this.viewFor(updated);
    }

    async replaceAccess(
        id: number,
        pages: PageKey[],
        events: EventKey[]
    ): Promise<AdminUserView> {
        const user = await this.requireUser(id);
        if (this.isEnvAdmin(user)) {
            throw new HttpException(
                403,
                'The environment admin account bypasses access grants',
                ENV_ADMIN_PROTECTED_CODE
            );
        }

        try {
            await this.access.replaceGrants(id, pages, events);
        } catch (error) {
            throw databaseException(error, 'Failed to update user access');
        }

        return this.viewFor(user);
    }

    private async requireUser(id: number): Promise<UserRecord> {
        let user: UserRecord | undefined;
        try {
            user = await User.findById(id);
        } catch (error) {
            throw databaseException(error, 'Failed to retrieve user');
        }
        if (!user) {
            throw new NotFoundException('User');
        }
        return user;
    }

    private async viewFor(user: UserRecord): Promise<AdminUserView> {
        try {
            return this.toView(user, await this.access.grantsFor(user.id));
        } catch (error) {
            throw databaseException(error, 'Failed to retrieve user access');
        }
    }

    private toView(user: UserRecord, access: UserAccess): AdminUserView {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            is_active: user.is_active,
            is_admin: user.is_admin,
            is_env_admin: this.isEnvAdmin(user),
            email_verified_at: user.email_verified_at,
            last_login_at: user.last_login_at,
            created_at: user.created_at,
            updated_at: user.updated_at,
            pages: access.pages,
            events: access.events,
        };
    }

    private isEnvAdmin(user: UserRecord): boolean {
        return user.email.trim().toLowerCase() === this.envAdminEmail;
    }
}
