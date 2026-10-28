/**
 * Human-readable command the template represents (e.g. "npm run dev"),
 * surfaced on the template card. Nullable — a template may omit it.
 *
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.up = async (query) => {
  await query(`
    ALTER TABLE dbo.templates ADD preview NVARCHAR(255) NULL;
  `);
};

/**
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.down = async (query) => {
  await query(`
    IF COL_LENGTH('dbo.templates', 'preview') IS NOT NULL
      ALTER TABLE dbo.templates DROP COLUMN preview;
  `);
};
