import './env';

const MIN_SECRET_LENGTH = 32;
const DEFAULT_EXPIRES_IN_SECONDS = 3600;
const MAX_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;

export interface AuthConfig {
    jwtSecret: string;
    jwtExpiresInSeconds: number;
}

type Env = Record<string, string | undefined>;

function expiresInFromEnv(raw: string | undefined): number {
    if (raw === undefined || raw.trim() === '') {
        return DEFAULT_EXPIRES_IN_SECONDS;
    }

    const seconds = Number(raw);
    if (!Number.isInteger(seconds) || seconds <= 0 || seconds > MAX_EXPIRES_IN_SECONDS) {
        throw new Error(
            `JWT_EXPIRES_IN must be a whole number of seconds between 1 and ${MAX_EXPIRES_IN_SECONDS} ` +
                `(received "${raw}") - check .env`
        );
    }
    return seconds;
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
        jwtExpiresInSeconds: expiresInFromEnv(env.JWT_EXPIRES_IN),
    };
}
