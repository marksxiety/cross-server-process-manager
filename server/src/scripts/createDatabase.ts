import { ConnectionPool } from 'mssql';
import { buildConfig } from '../config/databaseConfig';
import '../config/env';
import { ensureDatabaseExists } from '../utils/ensureDatabase';

const MAINTENANCE_DATABASE = 'master';

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
        const result = await ensureDatabaseExists(pool, database);

        if (result === 'existed') {
            console.log(`Database "${database}" already exists — skipping creation`);
            return;
        }

        console.log(`Database "${database}" created`);
    } finally {
        await pool.close();
    }
}

createDatabase().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
