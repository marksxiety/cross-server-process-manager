import { ConnectionPool } from 'mssql';
import { buildConfig } from '../../../config/database';
import '../../../config/env';
import { ensureDatabaseExists } from '../../Persistence/EnsureDatabase';

const MAINTENANCE_DATABASE = 'master';

export class CreateDatabaseCommand {
    async handle(): Promise<void> {
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
}

new CreateDatabaseCommand().handle().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
});
