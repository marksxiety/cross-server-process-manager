/**
 * Application accounts. `email` is the login identity and is unique; `role`
 * and `is_active` gate authorization, while `token_version` lets issued
 * tokens be invalidated by incrementing it.
 *
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.up = async (query) => {
  await query(`
    CREATE TABLE dbo.users (
      id INT IDENTITY(1,1) NOT NULL CONSTRAINT users_pkey PRIMARY KEY,
      email NVARCHAR(255) NOT NULL CONSTRAINT users_email_key UNIQUE,
      name NVARCHAR(100) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL CONSTRAINT users_role_default DEFAULT 'viewer',
      is_active BIT NOT NULL CONSTRAINT users_is_active_default DEFAULT 0,
      token_version INT NOT NULL CONSTRAINT users_token_version_default DEFAULT 0,
      email_verified_at DATETIME2(3) NULL,
      last_login_at DATETIME2(3) NULL,
      created_at DATETIME2(3) NOT NULL CONSTRAINT users_created_at_default DEFAULT SYSDATETIME(),
      updated_at DATETIME2(3) NOT NULL CONSTRAINT users_updated_at_default DEFAULT SYSDATETIME()
    );
  `);
};

/**
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.down = async (query) => {
  await query(`IF OBJECT_ID('dbo.users', 'U') IS NOT NULL DROP TABLE dbo.users;`);
};
