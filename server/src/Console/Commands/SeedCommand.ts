import '../../../config/env';
import db from '../../Persistence/Connection';
import { Seeder } from '../../Persistence/Seeder';

export class SeedCommand {
    async handle(): Promise<void> {
        try {
            await new Seeder().run();
        } finally {
            await db.close();
        }
    }
}

new SeedCommand().handle().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
});
