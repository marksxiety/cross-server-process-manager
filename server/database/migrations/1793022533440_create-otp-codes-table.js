/**
 * One-time codes for email verification and password reset. Only the hash is
 * stored; `purpose` is constrained to the flows that consume it, and the
 * lookup index serves "latest unused code for this user and purpose" reads.
 *
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.up = async (query) => {
  await query(`
    CREATE TABLE dbo.otp_codes (
      id INT IDENTITY(1,1) NOT NULL CONSTRAINT otp_codes_pkey PRIMARY KEY,
      user_id INT NOT NULL,
      code_hash VARCHAR(255) NOT NULL,
      purpose VARCHAR(20) NOT NULL,
      expires_at DATETIME2(3) NOT NULL,
      attempts INT NOT NULL CONSTRAINT otp_codes_attempts_default DEFAULT 0,
      used_at DATETIME2(3) NULL,
      created_at DATETIME2(3) NOT NULL CONSTRAINT otp_codes_created_at_default DEFAULT SYSDATETIME(),
      CONSTRAINT otp_codes_user_id_foreign FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE CASCADE,
      CONSTRAINT otp_codes_purpose_check CHECK (purpose IN ('verify', 'reset'))
    );
  `);

  await query(`
    CREATE INDEX ix_otp_lookup ON dbo.otp_codes (user_id, purpose, used_at);
  `);
};

/**
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.down = async (query) => {
  await query(`IF OBJECT_ID('dbo.otp_codes', 'U') IS NOT NULL DROP TABLE dbo.otp_codes;`);
};
