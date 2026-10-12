/**
 * Enforces UNIQUE(host) on servers, matching the application contract
 * (serverController HOST_UNIQUE_CONSTRAINT = 'servers_host_unique' and the
 * host_taken check on update).
 *
 * The sys.key_constraints guard makes re-runs safe (e.g. after clearing
 * migrations and replaying).
 *
 * @param {import('../src/scripts/migrate').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.up = async (query) => {
  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'servers_host_unique')
    BEGIN
      IF EXISTS (SELECT host FROM dbo.servers GROUP BY host HAVING COUNT(*) > 1)
      BEGIN
        ;THROW 51000, N'Cannot add UNIQUE(host) to servers: duplicate hosts exist. Dedupe those rows first, then re-run migrate:up.', 1;
      END

      ALTER TABLE dbo.servers
        ADD CONSTRAINT servers_host_unique UNIQUE (host);
    END
  `);
};

/**
 * @param {import('../src/scripts/migrate').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.down = async (query) => {
  await query(`
    IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'servers_host_unique')
      ALTER TABLE dbo.servers DROP CONSTRAINT servers_host_unique;
  `);
};
