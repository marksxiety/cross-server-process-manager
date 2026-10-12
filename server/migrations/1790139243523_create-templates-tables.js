/**
 * @param {import('../src/scripts/migrate').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.up = async (query) => {
  await query(`
    IF OBJECT_ID('dbo.templates', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.templates (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT templates_pkey PRIMARY KEY,
        template_name NVARCHAR(100) NOT NULL CONSTRAINT templates_template_name_key UNIQUE,
        description NVARCHAR(255) NULL,
        category NVARCHAR(255) NULL,
        is_active BIT NOT NULL CONSTRAINT templates_is_active_default DEFAULT 1,
        created_at DATETIME2(3) NOT NULL CONSTRAINT templates_created_at_default DEFAULT SYSDATETIME(),
        updated_at DATETIME2(3) NOT NULL CONSTRAINT templates_updated_at_default DEFAULT SYSDATETIME()
      );
    END
  `);
};

/**
 * @param {import('../src/scripts/migrate').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.down = async (query) => {
  await query(`IF OBJECT_ID('dbo.templates', 'U') IS NOT NULL DROP TABLE dbo.templates;`);
};
