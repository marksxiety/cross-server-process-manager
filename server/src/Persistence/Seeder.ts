import db from './Connection';
import { DatabaseSeeder } from '../../database/seeders/DatabaseSeeder';

export class Seeder {
    async run(): Promise<void> {
        const session = await db.beginTransaction();

        try {
            await new DatabaseSeeder().run(session);
            await session.commit();
            console.log('Seeding completed successfully.');
        } catch (err) {
            await session.rollback().catch(() => undefined);
            throw err;
        }
    }
}
