import db, { type DbQueryable } from '../Persistence/Connection';
import type { UserRecord } from '../Models/User';
import { toPublicUser, type PublicUser } from '../Models/User';
import {
    DEFAULT_EVENT_KEYS,
    DEFAULT_PAGE_KEYS,
    IMPLICIT_PAGE_KEY,
    allAccess,
    isEventKey,
    isPageKey,
    type EventKey,
    type PageKey,
    type UserAccess,
} from '../Security/AccessCatalog';

export class AccessService {
    async grantsFor(userId: number): Promise<UserAccess> {
        const [pages, events] = await Promise.all([
            db.query<{ page_key: string }>(
                'SELECT page_key FROM allowed_pages WHERE user_id = @p1',
                [userId]
            ),
            db.query<{ event_key: string }>(
                'SELECT event_key FROM allowed_events WHERE user_id = @p1',
                [userId]
            ),
        ]);

        return {
            pages: pages.rows
                .map((row) => row.page_key)
                .filter(isPageKey),
            events: events.rows
                .map((row) => row.event_key)
                .filter(isEventKey),
        };
    }

    async allGrants(): Promise<Map<number, UserAccess>> {
        const [pages, events] = await Promise.all([
            db.query<{ user_id: number; page_key: string }>(
                'SELECT user_id, page_key FROM allowed_pages'
            ),
            db.query<{ user_id: number; event_key: string }>(
                'SELECT user_id, event_key FROM allowed_events'
            ),
        ]);

        const byUser = new Map<number, UserAccess>();

        const accessFor = (userId: number): UserAccess => {
            let access = byUser.get(userId);
            if (!access) {
                access = { pages: [], events: [] };
                byUser.set(userId, access);
            }
            return access;
        };

        for (const row of pages.rows) {
            if (isPageKey(row.page_key)) {
                accessFor(row.user_id).pages.push(row.page_key);
            }
        }
        for (const row of events.rows) {
            if (isEventKey(row.event_key)) {
                accessFor(row.user_id).events.push(row.event_key);
            }
        }

        return byUser;
    }

    async effectiveFor(user: UserRecord): Promise<UserAccess> {
        if (user.is_admin) {
            return allAccess();
        }

        const grants = await this.grantsFor(user.id);
        return {
            pages: [
                IMPLICIT_PAGE_KEY,
                ...grants.pages.filter((page) => page !== IMPLICIT_PAGE_KEY),
            ],
            events: grants.events,
        };
    }

    async publicUser(user: UserRecord): Promise<PublicUser> {
        return toPublicUser(user, await this.effectiveFor(user));
    }

    async grantDefaults(
        userId: number,
        executor: DbQueryable = db
    ): Promise<void> {
        await this.grantPages(userId, DEFAULT_PAGE_KEYS, executor);
        await this.grantEvents(userId, DEFAULT_EVENT_KEYS, executor);
    }

    async replaceGrants(
        userId: number,
        pages: PageKey[],
        events: EventKey[]
    ): Promise<void> {
        const session = await db.beginTransaction();
        try {
            await session.query('DELETE FROM allowed_pages WHERE user_id = @p1', [userId]);
            await session.query('DELETE FROM allowed_events WHERE user_id = @p1', [userId]);
            await this.grantPages(
                userId,
                pages.filter((page) => page !== IMPLICIT_PAGE_KEY),
                session
            );
            await this.grantEvents(userId, events, session);
            await session.commit();
        } catch (error) {
            await session.rollback().catch(() => undefined);
            throw error;
        }
    }

    private async grantPages(
        userId: number,
        pages: readonly PageKey[],
        executor: DbQueryable = db
    ): Promise<void> {
        for (const page of new Set(pages)) {
            await executor.query(
                `INSERT INTO allowed_pages (user_id, page_key)
                 SELECT @p1, @p2
                 WHERE NOT EXISTS (
                     SELECT 1 FROM allowed_pages WHERE user_id = @p1 AND page_key = @p2
                 )`,
                [userId, page]
            );
        }
    }

    private async grantEvents(
        userId: number,
        events: readonly EventKey[],
        executor: DbQueryable = db
    ): Promise<void> {
        for (const event of new Set(events)) {
            await executor.query(
                `INSERT INTO allowed_events (user_id, event_key)
                 SELECT @p1, @p2
                 WHERE NOT EXISTS (
                     SELECT 1 FROM allowed_events WHERE user_id = @p1 AND event_key = @p2
                 )`,
                [userId, event]
            );
        }
    }
}
