import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ConnectionPool, Request, Transaction } from 'mssql';
import { buildConfig } from '../config/databaseConfig';
import '../config/env';

export type MigrationContext = (text: string) => Promise<void>;

interface MigrationModule {
    up?: unknown;
    down?: unknown;
    default?: { up?: unknown; down?: unknown };
}

interface Migration {
    name: string;
    up: (query: MigrationContext) => Promise<void> | void;
    down: (query: MigrationContext) => Promise<void> | void;
}

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');
const JOURNAL_TABLE = 'dbo.migrations';

function isMigrationFn(
    value: unknown
): value is (query: MigrationContext) => Promise<void> | void {
    return typeof value === 'function';
}

function quoteLiteral(value: string): string {
    return `N'${value.replace(/'/g, "''")}'`;
}

async function loadMigrations(): Promise<Migration[]> {
    const entries = await fs.readdir(MIGRATIONS_DIR);
    const files = entries
        .filter((file) => !file.endsWith('.d.ts') && (file.endsWith('.js') || file.endsWith('.ts')))
        .sort();

    const migrations: Migration[] = [];
    for (const file of files) {
        const url = pathToFileURL(path.join(MIGRATIONS_DIR, file)).href;
        const loaded = (await import(url)) as MigrationModule;
        const up = loaded.up ?? loaded.default?.up;
        const down = loaded.down ?? loaded.default?.down;

        if (!isMigrationFn(up) || !isMigrationFn(down)) {
            throw new Error(`Migration "${file}" must export up() and down()`);
        }

        migrations.push({ name: file, up, down });
    }
    return migrations;
}

async function ensureJournal(pool: ConnectionPool): Promise<void> {
    await pool.request().query(`
        IF OBJECT_ID('${JOURNAL_TABLE}', 'U') IS NULL
        BEGIN
            CREATE TABLE ${JOURNAL_TABLE} (
                name NVARCHAR(255) NOT NULL CONSTRAINT migrations_pkey PRIMARY KEY,
                run_on DATETIME2(3) NOT NULL CONSTRAINT migrations_run_on_default DEFAULT SYSDATETIME()
            );
        END
    `);
}

async function runMigration(
    pool: ConnectionPool,
    migration: Migration,
    direction: 'up' | 'down'
): Promise<void> {
    const transaction = new Transaction(pool);
    await transaction.begin();

    try {
        const request = new Request(transaction);
        const context: MigrationContext = async (text) => {
            await request.query(text);
        };

        if (direction === 'up') {
            await migration.up(context);
            await context(
                `INSERT INTO ${JOURNAL_TABLE} (name) VALUES (${quoteLiteral(migration.name)})`
            );
        } else {
            await migration.down(context);
            await context(`DELETE FROM ${JOURNAL_TABLE} WHERE name = ${quoteLiteral(migration.name)}`);
        }

        await transaction.commit();
    } catch (error) {
        await transaction.rollback().catch(() => undefined);
        throw error;
    }
}

async function appliedNames(pool: ConnectionPool): Promise<Set<string>> {
    const result = await pool
        .request()
        .query<{ name: string }>(`SELECT name FROM ${JOURNAL_TABLE}`);
    return new Set(result.recordset.map((row) => row.name));
}

async function migrateUp(pool: ConnectionPool, migrations: Migration[]): Promise<void> {
    const applied = await appliedNames(pool);
    const pending = migrations.filter((migration) => !applied.has(migration.name));

    if (pending.length === 0) {
        console.log('No pending migrations.');
        return;
    }

    for (const migration of pending) {
        console.log(`Applying ${migration.name}...`);
        await runMigration(pool, migration, 'up');
        console.log(`Applied ${migration.name}`);
    }
}

async function migrateDown(pool: ConnectionPool, migrations: Migration[]): Promise<void> {
    const result = await pool
        .request()
        .query<{ name: string }>(`SELECT TOP 1 name FROM ${JOURNAL_TABLE} ORDER BY name DESC`);

    const last = result.recordset[0];
    if (!last) {
        console.log('No applied migrations to revert.');
        return;
    }

    const migration = migrations.find((candidate) => candidate.name === last.name);
    if (!migration) {
        throw new Error(`Applied migration "${last.name}" has no file in migrations/`);
    }

    console.log(`Reverting ${migration.name}...`);
    await runMigration(pool, migration, 'down');
    console.log(`Reverted ${migration.name}`);
}

const SCAFFOLD = `/**
 * @param {import('../src/scripts/migrate').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.up = async (query) => {
  await query(\`
    -- write the forward migration here
  \`);
};

/**
 * @param {import('../src/scripts/migrate').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.down = async (query) => {
  await query(\`
    -- write the rollback here
  \`);
};
`;

async function createMigration(name: string | undefined): Promise<void> {
    if (!name || !name.trim()) {
        throw new Error('Usage: npm run migrate:create -- <name>');
    }

    const slug = name.trim().replace(/\s+/g, '-');
    const file = path.join(MIGRATIONS_DIR, `${Date.now()}_${slug}.js`);
    await fs.writeFile(file, SCAFFOLD, { flag: 'wx' });
    console.log(`Created ${file}`);
}

async function main(): Promise<void> {
    const command = process.argv[2];

    if (command === 'create') {
        await createMigration(process.argv[3]);
        return;
    }

    if (command !== 'up' && command !== 'down') {
        throw new Error('Usage: migrate.ts <up|down|create> [name]');
    }

    const pool = new ConnectionPool(buildConfig());
    await pool.connect();
    try {
        await ensureJournal(pool);
        const migrations = await loadMigrations();

        if (command === 'up') {
            await migrateUp(pool, migrations);
        } else {
            await migrateDown(pool, migrations);
        }
    } finally {
        await pool.close();
    }
}

main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
});
