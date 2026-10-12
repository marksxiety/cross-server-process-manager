import path from 'node:path';
import { pathToFileURL } from 'node:url';
import db, { type DbSession } from '../config/db';
import '../config/env';

type SeedFn = (session: DbSession) => Promise<void>;

// seed/index.ts must be imported dynamically: a static import would pull the
// seed/ directory into the tsc program and violate rootDir "./src".
const SEED_ENTRY = path.resolve(__dirname, '../../seed/index.ts');

function isSeedFn(value: unknown): value is SeedFn {
    return typeof value === 'function';
}

async function loadSeeders(): Promise<SeedFn[]> {
    const seedModule = (await import(pathToFileURL(SEED_ENTRY).href)) as { default?: unknown };
    const seeders = seedModule.default;

    if (!Array.isArray(seeders) || !seeders.every(isSeedFn)) {
        throw new Error('seed/index.ts must default-export an array of seed functions');
    }

    return seeders;
}

// Runs every seeder inside a single transaction: all seeders commit together
// or none of them do.
async function runSeeds(): Promise<void> {
    const seeders = await loadSeeders();
    const session = await db.beginTransaction();

    try {
        for (const [index, seed] of seeders.entries()) {
            console.log(`Running seeder ${index + 1}/${seeders.length}...`);
            await seed(session);
        }

        await session.commit();
        console.log('Seeding completed successfully.');
    } catch (err) {
        await session.rollback().catch(() => undefined);
        throw err;
    } finally {
        await db.close();
    }
}

runSeeds().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
});
