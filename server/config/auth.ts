import './env';

const MIN_SECRET_LENGTH = 32;
const DEFAULT_EXPIRES_IN_SECONDS = 60 * 60;
const MAX_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_REFRESH_TTL_DAYS = 30;
const MAX_REFRESH_TTL_DAYS = 365;
const DEFAULT_REFRESH_REUSE_GRACE_SECONDS = 30;
const MAX_REFRESH_REUSE_GRACE_SECONDS = 5 * 60;

export interface AuthConfig {
    jwtSecret: string;
    jwtExpiresInSeconds: number;
    refreshTokenTtlDays: number;
    refreshReuseGraceSeconds: number;
}

type Env = Record<string, string | undefined>;

interface BoundedIntegerOptions {
    name: string;
    defaultValue: number;
    min: number;
    max: number;
    unit: string;
}

function boundedIntegerFromEnv(raw: string | undefined, options: BoundedIntegerOptions): number {
    if (raw === undefined || raw.trim() === '') {
        return options.defaultValue;
    }

    const value = Number(raw);
    if (
        !Number.isInteger(value) ||
        value < options.min ||
        value > options.max
    ) {
        throw new Error(
            `${options.name} must be a whole number of ${options.unit} between ${options.min} and ${options.max} ` +
                `(received "${raw}") - check .env`
        );
    }
    return value;
}

export function loadAuthConfig(env: Env = process.env): AuthConfig {
    const jwtSecret = env.JWT_SECRET ?? '';

    if (jwtSecret.length === 0) {
        throw new Error('JWT_SECRET is not set - check .env');
    }
    if (jwtSecret.length < MIN_SECRET_LENGTH) {
        throw new Error(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters - check .env`);
    }

    return {
        jwtSecret,
        jwtExpiresInSeconds: boundedIntegerFromEnv(env.JWT_EXPIRES_IN, {
            name: 'JWT_EXPIRES_IN',
            defaultValue: DEFAULT_EXPIRES_IN_SECONDS,
            min: 1,
            max: MAX_EXPIRES_IN_SECONDS,
            unit: 'seconds',
        }),
        refreshTokenTtlDays: boundedIntegerFromEnv(env.REFRESH_TOKEN_TTL_DAYS, {
            name: 'REFRESH_TOKEN_TTL_DAYS',
            defaultValue: DEFAULT_REFRESH_TTL_DAYS,
            min: 1,
            max: MAX_REFRESH_TTL_DAYS,
            unit: 'days',
        }),
        refreshReuseGraceSeconds: boundedIntegerFromEnv(env.REFRESH_REUSE_GRACE_SECONDS, {
            name: 'REFRESH_REUSE_GRACE_SECONDS',
            defaultValue: DEFAULT_REFRESH_REUSE_GRACE_SECONDS,
            min: 0,
            max: MAX_REFRESH_REUSE_GRACE_SECONDS,
            unit: 'seconds',
        }),
    };
}
