import { describe, expect, it } from 'vitest';
import {
    ALL_PAGE_KEYS,
    DEFAULT_EVENT_KEYS,
    DEFAULT_PAGE_KEYS,
    EVENT_KEYS,
    GUEST_PAGE_KEYS,
    IMPLICIT_PAGE_KEY,
    PAGE_EVENTS,
    allAccess,
    defaultAccess,
    isEventKey,
    isPageKey,
} from '../../../src/Security/AccessCatalog';

describe('access catalog', () => {
    it('keeps dashboard implicit and grants only metrics by default', () => {
        expect(IMPLICIT_PAGE_KEY).toBe('dashboard');
        expect(DEFAULT_PAGE_KEYS).toEqual(['server_metrics']);
        expect(DEFAULT_EVENT_KEYS).toEqual([]);
        expect(defaultAccess()).toEqual({
            pages: ['dashboard', 'server_metrics'],
            events: [],
        });
    });

    it('allows guests to read dashboard and metrics only', () => {
        expect(GUEST_PAGE_KEYS).toEqual(['dashboard', 'server_metrics']);
    });

    it('grants every page and event to admins', () => {
        expect(allAccess().pages).toEqual(ALL_PAGE_KEYS);
        expect(allAccess().events).toEqual(EVENT_KEYS);
    });

    it('maps process and log events to both dashboard and process', () => {
        expect(PAGE_EVENTS.dashboard).toContain('process.start');
        expect(PAGE_EVENTS.process).toContain('process.delete');
        expect(PAGE_EVENTS.dashboard).toContain('logs.flush');
    });

    it('validates page and event keys', () => {
        expect(isPageKey('servers')).toBe(true);
        expect(isPageKey('dashboard')).toBe(true);
        expect(isPageKey('nope')).toBe(false);
        expect(isEventKey('server.create')).toBe(true);
        expect(isEventKey('server.nope')).toBe(false);
    });
});
