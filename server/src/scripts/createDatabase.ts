import { ConnectionPool } from 'mssql';
import { buildConfig } from '../config/databaseConfig';
import '../config/env';

const MAINTENANCE_DATABASE = 'master';

function quoteIdentifier(name: string): string {
    return `[${name.replace(/]/g, ']]')}]`;
}

// Idempotently creates the application database by connecting to the
// maintenance database first. Mirrors Laravel's separate DB-creation step:
// migrations can only run once the database exists.
async function createDatabase(): Promise<void> {
    const database = process.env.DB_DATABASE;
    if (!database) {
        throw new Error('DB_DATABASE is not set — check .env');
    }

    const pool = new ConnectionPool(buildConfig({ database: MAINTENANCE_DATABASE }));
    await pool.connect();
    try {
        const existing = await pool
            .request()
            .input('name', database)
            .query<{ name: string }>('SELECT name FROM sys.databases WHERE name = @name');

        if (existing.recordset.length > 0) {
            console.log(`Database "${database}" already exists`);
            return;
        }

        await pool.request().query(`CREATE DATABASE ${quoteIdentifier(database)}`);
        console.log(`Database "${database}" created`);
    } finally {
        await pool.close();
    }
}

createDatabase().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
