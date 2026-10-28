/**
 * Single-use links for email verification and password reset. Only the SHA-256
 * hash of the link token is stored; `used_at` makes consumption atomic and lets
 * the API distinguish reused, expired, and unknown links.
 *
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.up = async (query) => {
  await query(`
    CREATE TABLE dbo.auth_tokens (
      id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT auth_tokens_pkey PRIMARY KEY,
      user_id INT NOT NULL,
      purpose VARCHAR(20) NOT NULL,
      token_hash VARCHAR(64) NOT NULL,
      expires_at DATETIME2(3) NOT NULL,
      used_at DATETIME2(3) NULL,
      requested_ip VARCHAR(45) NULL,
      created_at DATETIME2(3) NOT NULL CONSTRAINT auth_tokens_created_at_default DEFAULT SYSDATETIME(),
      CONSTRAINT auth_tokens_user_id_foreign FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE CASCADE,
      CONSTRAINT auth_tokens_purpose_check CHECK (purpose IN ('verify', 'reset')),
      CONSTRAINT auth_tokens_token_hash_key UNIQUE (token_hash)
    );
  `);

  await query(`
    CREATE INDEX ix_auth_tokens_lookup ON dbo.auth_tokens (token_hash, purpose, used_at);
  `);

  await query(`
    CREATE INDEX ix_auth_tokens_user ON dbo.auth_tokens (user_id, purpose, created_at DESC);
  `);

  // Accounts that predate email verification stay usable; new registrations
  // still start unverified.
  await query(`
    UPDATE dbo.users
    SET email_verified_at = COALESCE(email_verified_at, SYSDATETIME())
    WHERE email_verified_at IS NULL;
  `);
};

/**
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.down = async (query) => {
  await query(`IF OBJECT_ID('dbo.auth_tokens', 'U') IS NOT NULL DROP TABLE dbo.auth_tokens;`);
};
