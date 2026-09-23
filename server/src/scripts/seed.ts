import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Client } from 'pg';
import '../config/env';

type SeedFn = (client: Client) => Promise<void>;

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

    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432', 10),
    });

    await client.connect();
    try {
        await client.query('BEGIN');

        for (const [index, seed] of seeders.entries()) {
            console.log(`Running seeder ${index + 1}/${seeders.length}...`);
            await seed(client);
        }

        await client.query('COMMIT');
        console.log('Seeding completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        await client.end();
    }
}

runSeeds().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
});
