import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ConnectionPool, Request, Transaction } from 'mssql';
import { isObjectAlreadyExistsError } from './DatabaseError';
import { MigrationRepository } from './MigrationRepository';
import { selectBaselineNames } from './MigrationBaseline';

export type MigrationContext = (text: string) => Promise<void>;

interface MigrationModule {
    up?: unknown;
    down?: unknown;
    default?: { up?: unknown; down?: unknown };
}

export interface Migration {
    name: string;
    up: (query: MigrationContext) => Promise<void> | void;
    down: (query: MigrationContext) => Promise<void> | void;
}

export function resolveMigrationsPath(): string {
    const candidates = [
        path.resolve(process.cwd(), 'database/migrations'),
        path.resolve(__dirname, '../../database/migrations'),
        path.resolve(__dirname, '../../../database/migrations'),
    ];

    return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]!;
}

function isMigrationFn(value: unknown): value is Migration['up'] {
    return typeof value === 'function';
}

export class Migrator {
    private readonly repository: MigrationRepository;

    constructor(
        private readonly pool: ConnectionPool,
        private readonly migrationsDir: string = resolveMigrationsPath()
    ) {
        this.repository = new MigrationRepository(pool);
    }

    async up(): Promise<void> {
        await this.repository.ensureTable();
        const migrations = await this.load();
        const applied = await this.repository.appliedNames();
        const pending = migrations.filter((migration) => !applied.has(migration.name));

        if (pending.length === 0) {
            console.log('No pending migrations.');
            return;
        }

        for (const migration of pending) {
            console.log(`Applying ${migration.name}...`);
            try {
                await this.runMigration(migration, 'up');
            } catch (error) {
                throw this.migrationFailure(migration, error);
            }
            console.log(`Applied ${migration.name}`);
        }
    }

    async down(): Promise<void> {
        await this.repository.ensureTable();
        const migrations = await this.load();
        const last = await this.repository.lastAppliedName();

        if (!last) {
            console.log('No applied migrations to revert.');
            return;
        }

        const migration = migrations.find((candidate) => candidate.name === last);
        if (!migration) {
            throw new Error(`Applied migration "${last}" has no file in database/migrations/`);
        }

        console.log(`Reverting ${migration.name}...`);
        await this.runMigration(migration, 'down');
        console.log(`Reverted ${migration.name}`);
    }

    async baseline(target: string | undefined): Promise<void> {
        await this.repository.ensureTable();
        const migrations = await this.load();
        const applied = await this.repository.appliedNames();
        const names = selectBaselineNames(
            migrations.map((migration) => migration.name),
            applied,
            target
        );

        if (names.length === 0) {
            console.log('No migrations to baseline.');
            return;
        }

        await this.repository.baseline(names);
        for (const name of names) {
            console.log(`Baselined ${name}`);
        }
    }

    private async runMigration(
        migration: Migration,
        direction: 'up' | 'down'
    ): Promise<void> {
        const transaction = new Transaction(this.pool);
        await transaction.begin();

        try {
            const request = new Request(transaction);
            const context: MigrationContext = async (text) => {
                await request.query(text);
            };

            if (direction === 'up') {
                await migration.up(context);
                await this.repository.record(context, migration.name);
            } else {
                await migration.down(context);
                await this.repository.forget(context, migration.name);
            }

            await transaction.commit();
        } catch (error) {
            await transaction.rollback().catch(() => undefined);
            throw error;
        }
    }

    private async load(): Promise<Migration[]> {
        const entries = await fs.readdir(this.migrationsDir);
        const files = entries
            .filter((file) => !file.endsWith('.d.ts') && (file.endsWith('.js') || file.endsWith('.ts')))
            .sort();

        const migrations: Migration[] = [];
        for (const file of files) {
            const url = pathToFileURL(path.join(this.migrationsDir, file)).href;
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

    private migrationFailure(migration: Migration, error: unknown): Error {
        const message = error instanceof Error ? error.message : String(error);
        const hint = isObjectAlreadyExistsError(error)
            ? `\nIf this schema already exists and ${migration.name} is not recorded, verify it and run:\n` +
              `  npm run db:migrate:baseline -w server -- ${migration.name}`
            : '';

        return new Error(`Migration "${migration.name}" failed: ${message}${hint}`, {
            cause: error,
        });
    }
}
