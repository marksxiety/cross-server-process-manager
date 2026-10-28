import db, { type DbQueryable } from '../Persistence/Connection';
import { describeDbError, isUniqueViolation } from '../Persistence/DatabaseError';

export interface RegistrationRequestRecord {
    id: number;
    email: string;
    name: string;
    token_hash: string;
    expires_at: Date;
    used_at: Date | null;
    user_id: number | null;
    created_at: Date;
    updated_at: Date;
}

export interface RegistrationRequestLookup extends RegistrationRequestRecord {
    is_expired: boolean | number;
}

export interface RegistrationRequestInput {
    email: string;
    name: string;
    tokenHash: string;
    ttlMinutes: number;
}

const UPDATE_SQL = `UPDATE registration_requests
    SET name = @p1,
        token_hash = @p2,
        expires_at = DATEADD(MINUTE, @p3, SYSDATETIME()),
        used_at = NULL,
        user_id = NULL,
        updated_at = SYSDATETIME()
    WHERE email = @p4`;

function updateParams(input: RegistrationRequestInput): unknown[] {
    return [input.name, input.tokenHash, input.ttlMinutes, input.email];
}

export class RegistrationRequest {
    /**
     * Creates or refreshes the pending registration for an email. The newest
     * token wins, so any older link is invalidated.
     */
    static async upsert(
        input: RegistrationRequestInput,
        executor: DbQueryable = db
    ): Promise<void> {
        const updated = await executor.query(UPDATE_SQL, updateParams(input));
        if (updated.rowCount > 0) {
            return;
        }

        try {
            await executor.query(
                `INSERT INTO registration_requests (email, name, token_hash, expires_at)
                 VALUES (@p1, @p2, @p3, DATEADD(MINUTE, @p4, SYSDATETIME()))`,
                [input.email, input.name, input.tokenHash, input.ttlMinutes]
            );
        } catch (error) {
            if (!isUniqueViolation(describeDbError(error))) {
                throw error;
            }
            // Another request inserted the same email first; refresh that row.
            await executor.query(UPDATE_SQL, updateParams(input));
        }
    }

    static async findByEmail(
        email: string,
        executor: DbQueryable = db
    ): Promise<RegistrationRequestRecord | undefined> {
        const { rows } = await executor.query<RegistrationRequestRecord>(
            'SELECT * FROM registration_requests WHERE email = @p1',
            [email]
        );
        return rows[0];
    }

    static async findByTokenHash(
        tokenHash: string,
        executor: DbQueryable = db
    ): Promise<RegistrationRequestLookup | undefined> {
        const { rows } = await executor.query<RegistrationRequestLookup>(
            `SELECT *,
                    CASE WHEN expires_at <= SYSDATETIME() THEN 1 ELSE 0 END AS is_expired
             FROM registration_requests
             WHERE token_hash = @p1`,
            [tokenHash]
        );
        return rows[0];
    }

    /** Atomically consumes an unused, unexpired token. */
    static async consume(
        tokenHash: string,
        executor: DbQueryable = db
    ): Promise<RegistrationRequestRecord | undefined> {
        const { rows } = await executor.query<RegistrationRequestRecord>(
            `UPDATE registration_requests
             SET used_at = SYSDATETIME(),
                 updated_at = SYSDATETIME()
             OUTPUT INSERTED.*
             WHERE token_hash = @p1
               AND used_at IS NULL
               AND expires_at > SYSDATETIME()`,
            [tokenHash]
        );
        return rows[0];
    }

    static async attachUser(
        id: number,
        userId: number,
        executor: DbQueryable = db
    ): Promise<void> {
        await executor.query(
            `UPDATE registration_requests
             SET user_id = @p1,
                 updated_at = SYSDATETIME()
             WHERE id = @p2`,
            [userId, id]
        );
    }
}
