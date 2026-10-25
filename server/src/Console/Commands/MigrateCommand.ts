import { ConnectionPool } from 'mssql';
import { buildConfig } from '../../../config/database';
import '../../../config/env';
import { Migrator } from '../../Persistence/Migrator';

export class MigrateCommand {
    async handle(): Promise<void> {
        const command = process.argv[2];

        if (command !== 'up' && command !== 'down' && command !== 'baseline') {
            throw new Error('Usage: MigrateCommand.ts <up|down|baseline> [name|--all]');
        }

        const pool = new ConnectionPool(buildConfig());
        await pool.connect();
        try {
            const migrator = new Migrator(pool);

            if (command === 'up') {
                await migrator.up();
            } else if (command === 'down') {
                await migrator.down();
            } else {
                await migrator.baseline(process.argv[3]);
            }
        } finally {
            await pool.close();
        }
    }
}

new MigrateCommand().handle().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
});
