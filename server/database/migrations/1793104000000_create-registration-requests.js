/**
 * Pending self-registrations. No `users` row exists until the emailed link is
 * consumed and a password is chosen, so an unverified signup cannot occupy an
 * account, block re-registration, or appear in the admin panel.
 *
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.up = async (query) => {
  await query(`
    CREATE TABLE dbo.registration_requests (
      id INT IDENTITY(1,1) NOT NULL CONSTRAINT registration_requests_pkey PRIMARY KEY,
      email NVARCHAR(255) NOT NULL CONSTRAINT registration_requests_email_key UNIQUE,
      name NVARCHAR(100) NOT NULL,
      token_hash VARCHAR(64) NOT NULL CONSTRAINT registration_requests_token_hash_key UNIQUE,
      expires_at DATETIME2(3) NOT NULL,
      used_at DATETIME2(3) NULL,
      user_id INT NULL,
      created_at DATETIME2(3) NOT NULL CONSTRAINT registration_requests_created_at_default DEFAULT SYSDATETIME(),
      updated_at DATETIME2(3) NOT NULL CONSTRAINT registration_requests_updated_at_default DEFAULT SYSDATETIME(),
      CONSTRAINT registration_requests_user_id_foreign
        FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE SET NULL
    );
  `);

  await query(`
    CREATE INDEX ix_registration_requests_token
      ON dbo.registration_requests (token_hash, used_at);
  `);

  await query(`
    CREATE INDEX ix_registration_requests_expiry
      ON dbo.registration_requests (expires_at);
  `);
};

/**
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.down = async (query) => {
  await query(
    `IF OBJECT_ID('dbo.registration_requests', 'U') IS NOT NULL DROP TABLE dbo.registration_requests;`
  );
};
