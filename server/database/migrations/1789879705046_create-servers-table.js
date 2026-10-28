/**
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.up = async (query) => {
  await query(`
    CREATE TABLE dbo.servers (
      id INT IDENTITY(1,1) NOT NULL CONSTRAINT servers_pkey PRIMARY KEY,
      server NVARCHAR(100) NOT NULL CONSTRAINT servers_server_key UNIQUE,
      protocol NVARCHAR(20) NOT NULL CONSTRAINT servers_protocol_default DEFAULT 'http',
      host NVARCHAR(255) NOT NULL,
      port INT NOT NULL,
      is_active BIT NOT NULL CONSTRAINT servers_is_active_default DEFAULT 1,
      created_at DATETIME2(3) NOT NULL CONSTRAINT servers_created_at_default DEFAULT SYSDATETIME(),
      updated_at DATETIME2(3) NOT NULL CONSTRAINT servers_updated_at_default DEFAULT SYSDATETIME()
    );
  `);
};

/**
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.down = async (query) => {
  await query(`IF OBJECT_ID('dbo.servers', 'U') IS NOT NULL DROP TABLE dbo.servers;`);
};
