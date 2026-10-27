/**
 * AUTH MVP: replaces the coarse `role` with an `is_admin` flag and stores
 * per-user page/event grants by stable code-level keys.
 *
 * Every existing account keeps dashboard (implicit) and gets the
 * `server_metrics` page. No events are granted by default.
 *
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.up = async (query) => {
  await query(`
    IF EXISTS (
      SELECT 1 FROM sys.default_constraints
      WHERE name = 'users_role_default' AND parent_object_id = OBJECT_ID('dbo.users')
    )
      ALTER TABLE dbo.users DROP CONSTRAINT users_role_default;

    IF COL_LENGTH('dbo.users', 'role') IS NOT NULL
      ALTER TABLE dbo.users DROP COLUMN role;

    IF COL_LENGTH('dbo.users', 'is_admin') IS NULL
      ALTER TABLE dbo.users
        ADD is_admin BIT NOT NULL CONSTRAINT users_is_admin_default DEFAULT 0;
  `);

  await query(`
    CREATE TABLE dbo.allowed_pages (
      user_id INT NOT NULL,
      page_key VARCHAR(50) NOT NULL,
      CONSTRAINT allowed_pages_pkey PRIMARY KEY (user_id, page_key),
      CONSTRAINT allowed_pages_user_foreign
        FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE CASCADE
    );
  `);

  await query(`
    CREATE TABLE dbo.allowed_events (
      user_id INT NOT NULL,
      event_key VARCHAR(80) NOT NULL,
      CONSTRAINT allowed_events_pkey PRIMARY KEY (user_id, event_key),
      CONSTRAINT allowed_events_user_foreign
        FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE CASCADE
    );
  `);

  await query(`
    INSERT INTO dbo.allowed_pages (user_id, page_key)
    SELECT u.id, 'server_metrics'
    FROM dbo.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM dbo.allowed_pages p
      WHERE p.user_id = u.id AND p.page_key = 'server_metrics'
    );
  `);
};

/**
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.down = async (query) => {
  await query(`
    IF OBJECT_ID('dbo.allowed_events', 'U') IS NOT NULL DROP TABLE dbo.allowed_events;
    IF OBJECT_ID('dbo.allowed_pages', 'U') IS NOT NULL DROP TABLE dbo.allowed_pages;
  `);

  await query(`
    IF EXISTS (
      SELECT 1 FROM sys.default_constraints
      WHERE name = 'users_is_admin_default' AND parent_object_id = OBJECT_ID('dbo.users')
    )
      ALTER TABLE dbo.users DROP CONSTRAINT users_is_admin_default;

    IF COL_LENGTH('dbo.users', 'is_admin') IS NOT NULL
      ALTER TABLE dbo.users DROP COLUMN is_admin;

    IF COL_LENGTH('dbo.users', 'role') IS NULL
      ALTER TABLE dbo.users
        ADD role VARCHAR(50) NOT NULL CONSTRAINT users_role_default DEFAULT 'viewer';
  `);
};
