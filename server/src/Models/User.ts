import db from '../Persistence/Connection';

export const DEFAULT_ROLE = 'viewer';

export interface UserRecord {
    id: number;
    email: string;
    name: string;
    password_hash: string;
    role: string;
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
    role: string;
    is_active: boolean;
    email_verified_at: Date | null;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface UserCreateAttributes {
    email: string;
    name: string;
    password_hash: string;
    role: string;
    is_active: boolean;
}

export function toPublicUser(user: UserRecord): PublicUser {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_active: user.is_active,
        email_verified_at: user.email_verified_at,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
    };
}

export class User {
    static async create(attributes: UserCreateAttributes): Promise<UserRecord | undefined> {
        const { rows } = await db.query<UserRecord>(
            `INSERT INTO users (email, name, password_hash, role, is_active)
             OUTPUT INSERTED.*
             VALUES (@p1, @p2, @p3, @p4, @p5)`,
            [
                attributes.email,
                attributes.name,
                attributes.password_hash,
                attributes.role,
                attributes.is_active,
            ]
        );
        return rows[0];
    }

    static async findByEmail(email: string): Promise<UserRecord | undefined> {
        const { rows } = await db.query<UserRecord>(
            'SELECT * FROM users WHERE email = @p1',
            [email]
        );
        return rows[0];
    }

    static async findById(id: number): Promise<UserRecord | undefined> {
        const { rows } = await db.query<UserRecord>('SELECT * FROM users WHERE id = @p1', [id]);
        return rows[0];
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
}
