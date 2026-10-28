export const IMPLICIT_PAGE_KEY = 'dashboard' as const;

export const PAGE_KEYS = [
    'process',
    'templates',
    'servers',
    'server_metrics',
] as const;

export const EVENT_KEYS = [
    'process.start',
    'process.stop',
    'process.restart',
    'process.reload',
    'process.delete',
    'logs.flush',
    'server.create',
    'server.update',
    'server.delete',
    'template.create',
    'template.update',
    'template.delete',
] as const;

export type PageKey = typeof IMPLICIT_PAGE_KEY | (typeof PAGE_KEYS)[number];
export type EventKey = (typeof EVENT_KEYS)[number];

export interface UserAccess {
    pages: PageKey[];
    events: EventKey[];
}

const PROCESS_EVENTS: EventKey[] = [
    'process.start',
    'process.stop',
    'process.restart',
    'process.reload',
    'process.delete',
    'logs.flush',
];

export const PAGE_EVENTS: Record<PageKey, EventKey[]> = {
    [IMPLICIT_PAGE_KEY]: PROCESS_EVENTS,
    process: PROCESS_EVENTS,
    templates: ['template.create', 'template.update', 'template.delete'],
    servers: ['server.create', 'server.update', 'server.delete'],
    server_metrics: [],
};

export const PAGE_NAMES: Record<PageKey, string> = {
    [IMPLICIT_PAGE_KEY]: 'Dashboard',
    process: 'Process',
    templates: 'Templates',
    servers: 'Servers',
    server_metrics: 'Server Metrics',
};

export const EVENT_NAMES: Record<EventKey, string> = {
    'process.start': 'Start process',
    'process.stop': 'Stop process',
    'process.restart': 'Restart process',
    'process.reload': 'Reload process',
    'process.delete': 'Delete process',
    'logs.flush': 'Flush logs',
    'server.create': 'Create server',
    'server.update': 'Update server',
    'server.delete': 'Delete server',
    'template.create': 'Create template',
    'template.update': 'Update template',
    'template.delete': 'Delete template',
};

export const ALL_PAGE_KEYS: PageKey[] = [IMPLICIT_PAGE_KEY, ...PAGE_KEYS];

/** Dashboard is implicit; only the metrics page is granted by default. */
export const DEFAULT_PAGE_KEYS: PageKey[] = ['server_metrics'];
export const DEFAULT_EVENT_KEYS: EventKey[] = [];

export const GUEST_PAGE_KEYS: PageKey[] = [IMPLICIT_PAGE_KEY, 'server_metrics'];

export function allAccess(): UserAccess {
    return {
        pages: [...ALL_PAGE_KEYS],
        events: [...EVENT_KEYS],
    };
}

export function defaultAccess(): UserAccess {
    return {
        pages: [IMPLICIT_PAGE_KEY, ...DEFAULT_PAGE_KEYS],
        events: [...DEFAULT_EVENT_KEYS],
    };
}

export function isPageKey(value: string): value is PageKey {
    return (ALL_PAGE_KEYS as readonly string[]).includes(value);
}

export function isEventKey(value: string): value is EventKey {
    return (EVENT_KEYS as readonly string[]).includes(value);
}
