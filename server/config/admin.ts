import './env';

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_NAME_LENGTH = 100;

export interface AdminConfig {
    email: string;
    name: string;
    password: string;
}

type Env = Record<string, string | undefined>;

function required(env: Env, name: string): string {
    const value = env[name];
    if (value === undefined || value.trim() === '') {
        throw new Error(`${name} is not set - check .env`);
    }
    return value;
}

export function loadAdminConfig(env: Env = process.env): AdminConfig {
    const email = required(env, 'ADMIN_EMAIL').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('ADMIN_EMAIL must be a valid email address - check .env');
    }

    const name = required(env, 'ADMIN_NAME').trim();
    if (name.length > MAX_NAME_LENGTH) {
        throw new Error(`ADMIN_NAME must be ${MAX_NAME_LENGTH} characters or less - check .env`);
    }

    const password = required(env, 'ADMIN_PASSWORD');
    if (password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(
            `ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters - check .env`
        );
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
        throw new Error(
            `ADMIN_PASSWORD must be ${MAX_PASSWORD_LENGTH} characters or less - check .env`
        );
    }

    return { email, name, password };
}
