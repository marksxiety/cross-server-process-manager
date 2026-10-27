import db, { type DbQueryable } from '../Persistence/Connection';
import type { EventKey, PageKey, UserAccess } from '../Security/AccessCatalog';

export interface UserRecord {
    id: number;
    email: string;
    name: string;
    password_hash: string;
    is_admin: boolean;
    is_active: boolean;
    token_version: number;
    email_verified_at: Date | null;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface PublicUser {
    id: number;
    email: string;
    name: string;
    is_admin: boolean;
    is_active: boolean;
    email_verified_at: Date | null;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
    pages: PageKey[];
    events: EventKey[];
}

export interface UserCreateAttributes {
    email: string;
    name: string;
    password_hash: string;
    is_active: boolean;
    is_admin: boolean;
}

export interface UserUpdateAttributes {
    email: string;
    name: string;
    is_active: boolean;
    is_admin: boolean;
}

export function toPublicUser(
    user: UserRecord,
    access: UserAccess = { pages: [], events: [] }
): PublicUser {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: user.is_admin,
        is_active: user.is_active,
        email_verified_at: user.email_verified_at,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
        pages: access.pages,
        events: access.events,
    };
}

export class User {
    static async create(
        attributes: UserCreateAttributes,
        executor: DbQueryable = db
    ): Promise<UserRecord | undefined> {
        const { rows } = await executor.query<UserRecord>(
            `INSERT INTO users (email, name, password_hash, is_active, is_admin)
             OUTPUT INSERTED.*
             VALUES (@p1, @p2, @p3, @p4, @p5)`,
            [
                attributes.email,
                attributes.name,
                attributes.password_hash,
                attributes.is_active,
                attributes.is_admin,
            ]
        );
        return rows[0];
    }

    static async createVerified(
        attributes: UserCreateAttributes,
        executor: DbQueryable = db
    ): Promise<UserRecord | undefined> {
        const { rows } = await executor.query<UserRecord>(
            `INSERT INTO users (email, name, password_hash, is_active, is_admin, email_verified_at)
             OUTPUT INSERTED.*
             VALUES (@p1, @p2, @p3, @p4, @p5, SYSDATETIME())`,
            [
                attributes.email,
                attributes.name,
                attributes.password_hash,
                attributes.is_active,
                attributes.is_admin,
            ]
        );
        return rows[0];
    }

    static async findByEmail(
        email: string,
        executor: DbQueryable = db
    ): Promise<UserRecord | undefined> {
        const { rows } = await executor.query<UserRecord>(
            'SELECT * FROM users WHERE email = @p1',
            [email]
        );
        return rows[0];
    }

    static async findById(id: number): Promise<UserRecord | undefined> {
        const { rows } = await db.query<UserRecord>('SELECT * FROM users WHERE id = @p1', [id]);
        return rows[0];
    }

    static async all(): Promise<UserRecord[]> {
        const { rows } = await db.query<UserRecord>('SELECT * FROM users ORDER BY id ASC');
        return rows;
    }

    static async touchLastLogin(id: number): Promise<UserRecord | undefined> {
        const { rows } = await db.query<UserRecord>(
            `UPDATE users
             SET last_login_at = SYSDATETIME(),
                 updated_at = SYSDATETIME()
             OUTPUT INSERTED.*
             WHERE id = @p1`,
            [id]
        );
        return rows[0];
    }

    static async markEmailVerified(id: number): Promise<UserRecord | undefined> {
        const { rows } = await db.query<UserRecord>(
            `UPDATE users
             SET email_verified_at = COALESCE(email_verified_at, SYSDATETIME()),
                 updated_at = SYSDATETIME()
             OUTPUT INSERTED.*
             WHERE id = @p1`,
            [id]
        );
        return rows[0];
    }

    static async updatePassword(
        id: number,
        passwordHash: string
    ): Promise<UserRecord | undefined> {
        const { rows } = await db.query<UserRecord>(
            `UPDATE users
             SET password_hash = @p1,
                 token_version = token_version + 1,
                 updated_at = SYSDATETIME()
             OUTPUT INSERTED.*
             WHERE id = @p2`,
            [passwordHash, id]
        );
        return rows[0];
    }

    static async bumpTokenVersion(id: number): Promise<UserRecord | undefined> {
        const { rows } = await db.query<UserRecord>(
            `UPDATE users
             SET token_version = token_version + 1,
                 updated_at = SYSDATETIME()
             OUTPUT INSERTED.*
             WHERE id = @p1`,
            [id]
        );
        return rows[0];
    }

    static async updateAdmin(
        id: number,
        attributes: UserUpdateAttributes
    ): Promise<UserRecord | undefined> {
        const { rows } = await db.query<UserRecord>(
            `UPDATE users
             SET email = @p1,
                 name = @p2,
                 is_active = @p3,
                 is_admin = @p4,
                 updated_at = SYSDATETIME()
             OUTPUT INSERTED.*
             WHERE id = @p5`,
            [
                attributes.email,
                attributes.name,
                attributes.is_active,
                attributes.is_admin,
                id,
            ]
        );
        return rows[0];
    }
}
