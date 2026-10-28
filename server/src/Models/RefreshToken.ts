import db, { type DbQueryable, type DbSession } from '../Persistence/Connection';

export interface RefreshTokenRecord {
    id: number;
    user_id: number;
    token_hash: string;
    family_id: string;
    token_version: number;
    expires_at: Date;
    used_at: Date | null;
    created_at: Date;
}

export interface RefreshTokenLookup extends RefreshTokenRecord {
    is_expired: boolean | number;
    /** True when the token was used longer ago than the reuse grace window. */
    is_reuse: boolean | number;
}

export interface RefreshTokenIssue {
    userId: number;
    tokenHash: string;
    familyId: string;
    tokenVersion: number;
    ttlDays: number;
}

export interface RefreshTokenRotate {
    currentHash: string;
    nextTokenHash: string;
    userId: number;
    familyId: string;
    tokenVersion: number;
    ttlDays: number;
}

const INSERT_SQL = `INSERT INTO refresh_tokens (user_id, token_hash, family_id, token_version, expires_at)
    VALUES (@p1, @p2, @p3, @p4, DATEADD(DAY, @p5, SYSDATETIME()))`;

const INSERT_PARAMS = (input: RefreshTokenIssue): unknown[] => [
    input.userId,
    input.tokenHash,
    input.familyId,
    input.tokenVersion,
    input.ttlDays,
];

export class RefreshToken {
    static async issue(input: RefreshTokenIssue, executor: DbQueryable = db): Promise<void> {
        await executor.query(INSERT_SQL, INSERT_PARAMS(input));
    }

    /**
     * Returns the token plus SQL-computed expiry/reuse flags so the caller never
     * has to compare database timestamps against the API host's clock.
     */
    static async classify(
        tokenHash: string,
        graceSeconds: number,
        executor: DbQueryable = db
    ): Promise<RefreshTokenLookup | undefined> {
        const { rows } = await executor.query<RefreshTokenLookup>(
            `SELECT *,
                    CASE WHEN expires_at <= SYSDATETIME() THEN 1 ELSE 0 END AS is_expired,
                    CASE WHEN used_at IS NOT NULL AND used_at <= DATEADD(SECOND, @p2, SYSDATETIME())
                         THEN 1 ELSE 0 END AS is_reuse
             FROM refresh_tokens
             WHERE token_hash = @p1`,
            [tokenHash, -graceSeconds]
        );
        return rows[0];
    }

    /** Atomically consumes an unused, unexpired token. */
    static async consume(
        tokenHash: string,
        executor: DbQueryable = db
    ): Promise<RefreshTokenRecord | undefined> {
        const { rows } = await executor.query<RefreshTokenRecord>(
            `UPDATE refresh_tokens
             SET used_at = SYSDATETIME()
             OUTPUT INSERTED.*
             WHERE token_hash = @p1
               AND used_at IS NULL
               AND expires_at > SYSDATETIME()`,
            [tokenHash]
        );
        return rows[0];
    }

    /**
     * Consumes the current token and stores its replacement in one transaction.
     * Returns false when another request already consumed it.
     */
    static async rotate(input: RefreshTokenRotate): Promise<boolean> {
        const session: DbSession = await db.beginTransaction();

        try {
            const consumed = await this.consume(input.currentHash, session);
            if (!consumed) {
                await session.rollback();
                return false;
            }

            await this.issue(
                {
                    userId: input.userId,
                    tokenHash: input.nextTokenHash,
                    familyId: input.familyId,
                    tokenVersion: input.tokenVersion,
                    ttlDays: input.ttlDays,
                },
                session
            );
            await session.commit();
            return true;
        } catch (error) {
            await session.rollback().catch(() => undefined);
            throw error;
        }
    }

    static async revokeFamily(familyId: string, executor: DbQueryable = db): Promise<void> {
        await executor.query(
            `UPDATE refresh_tokens
             SET used_at = SYSDATETIME()
             WHERE family_id = @p1 AND used_at IS NULL`,
            [familyId]
        );
    }

    /** Best-effort cleanup; expired rows are useless for reuse detection. */
    static async purgeExpired(userId: number, executor: DbQueryable = db): Promise<void> {
        await executor.query(
            'DELETE FROM refresh_tokens WHERE user_id = @p1 AND expires_at <= SYSDATETIME()',
            [userId]
        );
    }
}
