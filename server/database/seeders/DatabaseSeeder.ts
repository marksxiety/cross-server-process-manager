import type { DbSession } from '../../src/Persistence/Connection';
import { TemplateSeeder } from './TemplateSeeder';

export class DatabaseSeeder {
    async run(session: DbSession): Promise<void> {
        const seeders = [new TemplateSeeder()];

        for (const [index, seeder] of seeders.entries()) {
            console.log(`Running seeder ${index + 1}/${seeders.length}...`);
            await seeder.run(session);
        }
    }
}
