/**
 * Append-only record of user actions. `category` groups the domain
 * (auth/server/process/template/admin/mail), `action` is the short verb, and
 * `details` is the human-readable sentence shown in the admin audit page.
 * `user_id` is nullable and cleared (SET NULL) when the acting account is
 * deleted, so history survives account removal.
 *
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.up = async (query) => {
  await query(`
    CREATE TABLE dbo.audit_log (
      id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT audit_log_pkey PRIMARY KEY,
      user_id INT NULL,
      category VARCHAR(20) NOT NULL,
      action VARCHAR(30) NOT NULL,
      details NVARCHAR(MAX) NULL,
      ip_address VARCHAR(45) NULL,
      created_at DATETIME2(3) NOT NULL CONSTRAINT audit_log_created_at_default DEFAULT SYSUTCDATETIME(),
      CONSTRAINT audit_log_user_id_foreign FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE SET NULL
    );
  `);

  await query(`
    CREATE INDEX ix_audit_created ON dbo.audit_log (created_at DESC);
  `);

  await query(`
    CREATE INDEX ix_audit_user ON dbo.audit_log (user_id, created_at DESC);
  `);
};

/**
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.down = async (query) => {
  await query(`IF OBJECT_ID('dbo.audit_log', 'U') IS NOT NULL DROP TABLE dbo.audit_log;`);
};
