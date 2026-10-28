/**
 * Rotating refresh tokens for long-lived sessions. Only the SHA-256 hash is
 * stored. `family_id` groups every token descended from one login so that
 * reuse of a rotated token can revoke just that device, and `token_version`
 * snapshots the account version so a logout or password change invalidates
 * outstanding sessions without deleting rows.
 *
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.up = async (query) => {
  await query(`
    CREATE TABLE dbo.refresh_tokens (
      id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT refresh_tokens_pkey PRIMARY KEY,
      user_id INT NOT NULL,
      token_hash VARCHAR(64) NOT NULL,
      family_id VARCHAR(36) NOT NULL,
      token_version INT NOT NULL,
      expires_at DATETIME2(3) NOT NULL,
      used_at DATETIME2(3) NULL,
      created_at DATETIME2(3) NOT NULL CONSTRAINT refresh_tokens_created_at_default DEFAULT SYSDATETIME(),
      CONSTRAINT refresh_tokens_user_id_foreign FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE CASCADE,
      CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash)
    );
  `);

  await query(`
    CREATE INDEX ix_refresh_tokens_lookup ON dbo.refresh_tokens (token_hash, used_at);
  `);

  await query(`
    CREATE INDEX ix_refresh_tokens_user ON dbo.refresh_tokens (user_id, expires_at);
  `);

  await query(`
    CREATE INDEX ix_refresh_tokens_family ON dbo.refresh_tokens (family_id, used_at);
  `);
};

/**
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.down = async (query) => {
  await query(
    `IF OBJECT_ID('dbo.refresh_tokens', 'U') IS NOT NULL DROP TABLE dbo.refresh_tokens;`
  );
};
