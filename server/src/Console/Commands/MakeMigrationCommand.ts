import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveMigrationsPath } from '../../Persistence/Migrator';

const SCAFFOLD = `/**
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.up = async (query) => {
  await query(\`
    -- write the forward migration here
  \`);
};

/**
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.down = async (query) => {
  await query(\`
    -- write the rollback here
  \`);
};
`;

export class MakeMigrationCommand {
    async handle(): Promise<void> {
        const name = process.argv[2];
        if (!name || !name.trim()) {
            throw new Error('Usage: npm run migrate:create -- <name>');
        }

        const slug = name.trim().replace(/\s+/g, '-');
        const file = path.join(resolveMigrationsPath(), `${Date.now()}_${slug}.js`);
        await fs.writeFile(file, SCAFFOLD, { flag: 'wx' });
        console.log(`Created ${file}`);
    }
}

new MakeMigrationCommand().handle().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
});
