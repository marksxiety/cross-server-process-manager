/**
 * Enforces UNIQUE(host) on servers, matching the application contract
 * (serverController HOST_UNIQUE_CONSTRAINT = 'servers_host_unique' and the
 * host_taken check on update).
 *
 * This migration assumes it has not run. If the constraint already exists
 * while this file is unrecorded, SQL Server raises an "already exists" error
 * and the transaction rolls back; verify the schema and baseline it instead.
 *
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.up = async (query) => {
  await query(`
    IF EXISTS (SELECT host FROM dbo.servers GROUP BY host HAVING COUNT(*) > 1)
    BEGIN
      ;THROW 51000, N'Cannot add UNIQUE(host) to servers: duplicate hosts exist. Dedupe those rows first, then re-run db:migrate.', 1;
    END

    ALTER TABLE dbo.servers
      ADD CONSTRAINT servers_host_unique UNIQUE (host);
  `);
};

/**
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.down = async (query) => {
  await query(`
    IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'servers_host_unique')
      ALTER TABLE dbo.servers DROP CONSTRAINT servers_host_unique;
  `);
};
