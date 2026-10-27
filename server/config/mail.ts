import './env';

const DEFAULT_LINK_TTL_MINUTES = 30;
const MAX_LINK_TTL_MINUTES = 24 * 60;
const DEFAULT_SMTP_PORT = 587;
const DEFAULT_PROTOCOL = 'http';

export interface SmtpConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
}

export interface MailConfig {
    linkBaseUrl: string;
    linkTtlMinutes: number;
    smtp: SmtpConfig | null;
}

type Env = Record<string, string | undefined>;

function trimmed(env: Env, name: string): string {
    return (env[name] ?? '').trim();
}

function linkTtlFromEnv(raw: string | undefined): number {
    if (raw === undefined || raw.trim() === '') {
        return DEFAULT_LINK_TTL_MINUTES;
    }

    const minutes = Number(raw);
    if (!Number.isInteger(minutes) || minutes <= 0 || minutes > MAX_LINK_TTL_MINUTES) {
        throw new Error(
            `AUTH_LINK_TTL_MINUTES must be a whole number of minutes between 1 and ${MAX_LINK_TTL_MINUTES} ` +
                `(received "${raw}") - check .env`
        );
    }
    return minutes;
}

function booleanFromEnv(raw: string | undefined, fallback: boolean): boolean {
    if (raw === undefined || raw.trim() === '') {
        return fallback;
    }
    return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

function normalizeBaseUrl(raw: string, name: string): string {
    const url = raw.trim().replace(/\/+$/, '');
    if (!/^https?:\/\/[^/]+/.test(url)) {
        throw new Error(`${name} must start with http:// or https:// - check .env`);
    }
    return url;
}

function protocolFromEnv(env: Env): 'http' | 'https' {
    const raw = (trimmed(env, 'VITE_SERVER_PROTOCOL') || DEFAULT_PROTOCOL).toLowerCase();
    if (raw !== 'http' && raw !== 'https') {
        throw new Error(
            `VITE_SERVER_PROTOCOL must be "http" or "https" (received "${raw}") - check .env`
        );
    }
    return raw;
}

function webPortFromEnv(env: Env): number {
    const raw = trimmed(env, 'VITE_WEB_PORT');
    if (raw === '') {
        throw new Error(
            'VITE_WEB_PORT is not set - set it or provide AUTH_LINK_BASE_URL - check .env'
        );
    }

    const port = Number(raw);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(
            `VITE_WEB_PORT must be an integer between 1 and 65535 (received "${raw}") - check .env`
        );
    }
    return port;
}

/**
 * Base URL for verification and password-reset links. An explicit
 * AUTH_LINK_BASE_URL wins; otherwise it is derived from the dashboard's
 * VITE_SERVER_PROTOCOL / VITE_SERVER_HOST / VITE_WEB_PORT settings.
 */
function linkBaseUrlFromEnv(env: Env): string {
    const explicit = trimmed(env, 'AUTH_LINK_BASE_URL');
    if (explicit !== '') {
        return normalizeBaseUrl(explicit, 'AUTH_LINK_BASE_URL');
    }

    const host = trimmed(env, 'VITE_SERVER_HOST');
    if (host === '') {
        throw new Error(
            'VITE_SERVER_HOST is not set - set it or provide AUTH_LINK_BASE_URL - check .env'
        );
    }

    const protocol = protocolFromEnv(env);
    const port = webPortFromEnv(env);
    return normalizeBaseUrl(
        `${protocol}://${host}:${port}`,
        'Derived AUTH_LINK_BASE_URL'
    );
}

function smtpFromEnv(env: Env): SmtpConfig | null {
    const host = trimmed(env, 'MAIL_HOST');
    if (host === '') {
        return null;
    }

    const rawPort = trimmed(env, 'MAIL_PORT') || String(DEFAULT_SMTP_PORT);
    const port = Number(rawPort);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(
            `MAIL_PORT must be an integer between 1 and 65535 (received "${rawPort}") - check .env`
        );
    }

    const user = trimmed(env, 'MAIL_USER');
    const password = env.MAIL_PASS ?? '';
    if (user === '' || password === '') {
        throw new Error('MAIL_USER and MAIL_PASS are required when MAIL_HOST is set - check .env');
    }

    return {
        host,
        port,
        secure: booleanFromEnv(env.MAIL_SECURE, port === 465),
        user,
        password,
        from: trimmed(env, 'MAIL_FROM') || user,
    };
}

export function loadMailConfig(env: Env = process.env): MailConfig {
    return {
        linkBaseUrl: linkBaseUrlFromEnv(env),
        linkTtlMinutes: linkTtlFromEnv(env.AUTH_LINK_TTL_MINUTES),
        smtp: smtpFromEnv(env),
    };
}
