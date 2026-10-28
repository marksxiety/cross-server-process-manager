import type { UserAccess } from '../Security/AccessCatalog';

export interface ServerRef {
    id: number;
    server: string;
    host: string;
    port: number;
}

export interface TemplateRef {
    id: number;
    template_name: string;
}

export interface AdminUserRef {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    is_admin: boolean;
}

export type Changes = Record<string, unknown>;

export const auditMessage = {
    login: 'Signed in',
    logout: 'Signed out',
    register: 'Requested registration',
    resendVerification: 'Requested a new verification email',
    emailVerified: 'Verified email',
    passwordResetRequested: 'Requested a password reset',
    passwordChanged: 'Changed password',
    refreshReuse: 'Refresh token reuse detected',
} as const;

const LOGIN_FAILURE_REASONS: Record<string, string> = {
    INVALID_CREDENTIALS: 'invalid credentials',
    ACCOUNT_DISABLED: 'account disabled',
    EMAIL_NOT_VERIFIED: 'email not verified',
};

const PROCESS_VERBS: Record<string, string> = {
    start: 'Started',
    stop: 'Stopped',
    restart: 'Restarted',
    reload: 'Reloaded',
    delete: 'Deleted',
};

function formatValue(value: unknown): string {
    if (value === null || value === undefined) return 'none';
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'none';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function formatChanges(changes: Changes): string {
    const fields = Array.isArray(changes.changed) ? (changes.changed as string[]) : [];

    return fields
        .map((field) => {
            const diff = changes[field] as { from?: unknown; to?: unknown } | undefined;
            if (!diff) return field;
            return `${field} ${formatValue(diff.from)} → ${formatValue(diff.to)}`;
        })
        .join(', ');
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB'];

function formatBytes(bytes: number): string {
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${Math.round(value * 10) / 10} ${BYTE_UNITS[unit]}`;
}

function processLabel(name: string | undefined, pmId: number): string {
    return name ? `${name} (pm_id ${pmId})` : `pm_id ${pmId}`;
}

export function serverCreated(server: ServerRef): string {
    return `Registered server ${server.server} (${server.host}:${server.port})`;
}

export function serverUpdated(server: ServerRef, changes: Changes): string {
    const diff = formatChanges(changes);
    return diff ? `Updated server ${server.server}: ${diff}` : `Updated server ${server.server}`;
}

export function serverDeleted(server: ServerRef): string {
    return `Deleted server ${server.server} (id ${server.id})`;
}

export function processCreated(
    serverName: string,
    name: string | undefined,
    pmId: number
): string {
    return `Created process ${processLabel(name, pmId)} on ${serverName}`;
}

export function processCommand(
    action: string,
    serverName: string,
    name: string | undefined,
    pmId: number
): string {
    const verb = PROCESS_VERBS[action] ?? 'Changed';
    const preposition = action === 'delete' ? 'from' : 'on';
    return `${verb} process ${processLabel(name, pmId)} ${preposition} ${serverName}`;
}

export function logsCleared(
    serverName: string,
    name: string | undefined,
    pmId: number,
    stream: string,
    scope: string,
    bytesFreed?: number
): string {
    const options = [`stream: ${stream}`, `scope: ${scope}`];
    if (bytesFreed !== undefined) {
        options.push(`${formatBytes(bytesFreed)} freed`);
    }
    return `Cleared logs for ${processLabel(name, pmId)} on ${serverName} (${options.join(', ')})`;
}

export function templateCreated(template: TemplateRef): string {
    return `Created template ${template.template_name} (id ${template.id})`;
}

export function templateUpdated(template: TemplateRef, changes: Changes): string {
    const diff = formatChanges(changes);
    return diff
        ? `Updated template ${template.template_name}: ${diff}`
        : `Updated template ${template.template_name}`;
}

export function templateDeleted(template: TemplateRef): string {
    return `Deleted template ${template.template_name} (id ${template.id})`;
}

export function userUpdated(previous: AdminUserRef, next: AdminUserRef): string {
    const fields = ['name', 'email', 'is_active', 'is_admin'] as const;
    const parts: string[] = [];

    for (const field of fields) {
        if (previous[field] !== next[field]) {
            parts.push(
                `${field} ${formatValue(previous[field])} → ${formatValue(next[field])}`
            );
        }
    }

    const suffix = parts.length > 0 ? `: ${parts.join(', ')}` : '';
    return `Updated user ${next.name} (id ${next.id})${suffix}`;
}

export function accessUpdated(
    user: { id: number; name: string },
    previous: UserAccess,
    next: UserAccess
): string {
    const parts: string[] = [];

    if (JSON.stringify(previous.pages) !== JSON.stringify(next.pages)) {
        parts.push(`pages ${formatValue(previous.pages)} → ${formatValue(next.pages)}`);
    }
    if (JSON.stringify(previous.events) !== JSON.stringify(next.events)) {
        parts.push(`events ${formatValue(previous.events)} → ${formatValue(next.events)}`);
    }

    const suffix = parts.length > 0 ? `: ${parts.join(', ')}` : '';
    return `Updated access for ${user.name} (id ${user.id})${suffix}`;
}

export function loginFailed(reason: string): string {
    return `Failed sign-in (${LOGIN_FAILURE_REASONS[reason] ?? reason.toLowerCase()})`;
}

export function mailFailed(kind: 'verification' | 'password_reset'): string {
    return `Could not send ${kind === 'verification' ? 'verification' : 'password reset'} email`;
}
