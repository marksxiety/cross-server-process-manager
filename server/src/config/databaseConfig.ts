import type { config as MssqlConfig } from 'mssql';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 1433;
const MIN_PORT = 1;
const MAX_PORT = 65535;
const SQLSRV_CONNECTION = 'sqlsrv';

function requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not set — check .env`);
    }
    return value;
}

function portFromEnv(): number {
    const raw = process.env.DB_PORT;
    const port = raw ? Number(raw) : DEFAULT_PORT;
    if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
        throw new Error(`DB_PORT is not a valid port (received "${raw ?? ''}") — check .env`);
    }
    return port;
}

export function buildConfig(overrides: Partial<MssqlConfig> = {}): MssqlConfig {
    if (process.env.DB_CONNECTION !== SQLSRV_CONNECTION) {
        throw new Error(
            `DB_CONNECTION must be "${SQLSRV_CONNECTION}" ` +
                `(received "${process.env.DB_CONNECTION ?? ''}") — check .env`
        );
    }

    return {
        server: process.env.DB_HOST || DEFAULT_HOST,
        port: portFromEnv(),
        database: requiredEnv('DB_DATABASE'),
        user: requiredEnv('DB_USERNAME'),
        password: process.env.DB_PASSWORD ?? '',
        options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
        },
        pool: { min: 0, max: 10 },
        ...overrides,
    };
}
