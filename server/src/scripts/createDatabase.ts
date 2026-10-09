import { Client } from 'pg';
import '../config/env';

const MAINTENANCE_DB = process.env.DB_MAINTENANCE_NAME || 'postgres';

function quoteIdentifier(name: string): string {
    return `"${name.replace(/"/g, '""')}"`;
}

// Idempotently creates the application database by connecting to the
// maintenance database first. Mirrors Laravel's separate DB-creation step:
// migrations can only run once the database exists.
async function createDatabase(): Promise<void> {
    const database = process.env.DB_NAME;
    if (!database) {
        throw new Error('DB_NAME is not set — check .env');
    }

    const client = new Client({
        user: process.env.DB_USER ?? '',
        host: process.env.DB_HOST ?? '',
        database: MAINTENANCE_DB,
        password: process.env.DB_PASSWORD ?? '',
        port: parseInt(process.env.DB_PORT || '5432', 10),
    });

    await client.connect();
    try {
        const { rowCount } = await client.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [database]
        );

        if (rowCount && rowCount > 0) {
            console.log(`Database "${database}" already exists`);
            return;
        }

        await client.query(`CREATE DATABASE ${quoteIdentifier(database)}`);
        console.log(`Database "${database}" created`);
    } finally {
        await client.end();
    }
}

createDatabase().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
