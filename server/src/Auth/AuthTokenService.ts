import db, { type DbQueryable } from '../Persistence/Connection';
import { generateLinkToken, hashLinkToken } from './LinkTokens';

export {
    generateLinkToken as generateAuthToken,
    hashLinkToken as hashAuthToken,
};

export type AuthTokenPurpose = 'reset';

export type ConsumeResult =
    | { status: 'consumed'; userId: number }
    | { status: 'used'; userId: number }
    | { status: 'expired'; userId: number }
    | { status: 'invalid' };

export class AuthTokenService {
    constructor(private readonly ttlMinutes: number) {}

    /** Issues a new link token and invalidates any unused tokens for the same purpose. */
    async issue(
        userId: number,
        purpose: AuthTokenPurpose,
        requestedIp?: string
    ): Promise<string> {
        const token = generateLinkToken();

        const session = await db.beginTransaction();
        try {
            await this.invalidate(userId, purpose, session);
            // Expiry is computed by SQL Server so it matches the clock used by
            // the consume check, regardless of the API host's timezone.
            await session.query(
                `INSERT INTO auth_tokens (user_id, purpose, token_hash, expires_at, requested_ip)
                 VALUES (@p1, @p2, @p3, DATEADD(MINUTE, @p4, SYSDATETIME()), @p5)`,
                [userId, purpose, hashLinkToken(token), this.ttlMinutes, requestedIp ?? null]
            );
            await session.commit();
        } catch (error) {
            await session.rollback().catch(() => undefined);
            throw error;
        }

        return token;
    }

    /**
     * Atomically marks the token as used. A conditional UPDATE means only one
     * caller can consume a token, even when two requests race.
     */
    async consume(token: string, purpose: AuthTokenPurpose): Promise<ConsumeResult> {
        const hash = hashLinkToken(token);

        const consumed = await db.query<{ user_id: number }>(
            `UPDATE auth_tokens
             SET used_at = SYSDATETIME()
             OUTPUT INSERTED.user_id AS user_id
             WHERE token_hash = @p1
               AND purpose = @p2
               AND used_at IS NULL
               AND expires_at > SYSDATETIME()`,
            [hash, purpose]
        );

        const consumedUserId = consumed.rows[0]?.user_id;
        if (consumedUserId !== undefined) {
            return { status: 'consumed', userId: consumedUserId };
        }

        const existing = await db.query<{
            user_id: number;
            used_at: Date | null;
            is_expired: boolean | number;
        }>(
            `SELECT user_id, used_at,
                    CASE WHEN expires_at <= SYSDATETIME() THEN 1 ELSE 0 END AS is_expired
             FROM auth_tokens
             WHERE token_hash = @p1 AND purpose = @p2`,
            [hash, purpose]
        );

        const row = existing.rows[0];
        if (!row) {
            return { status: 'invalid' };
        }
        if (row.used_at !== null) {
            return { status: 'used', userId: row.user_id };
        }
        if (row.is_expired) {
            return { status: 'expired', userId: row.user_id };
        }
        return { status: 'invalid' };
    }

    async invalidate(
        userId: number,
        purpose: AuthTokenPurpose,
        executor: DbQueryable = db
    ): Promise<void> {
        await executor.query(
            `UPDATE auth_tokens
             SET used_at = SYSDATETIME()
             WHERE user_id = @p1 AND purpose = @p2 AND used_at IS NULL`,
            [userId, purpose]
        );
    }
}
