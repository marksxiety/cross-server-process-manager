/**
 * Per-field storage for template values: one row per PM2 option key.
 * `property_value` holds scalars as text and arrays/objects as JSON, while
 * `data_type` records the original type so values round-trip exactly.
 *
 * This migration assumes it has not run. If the table already exists while
 * this file is unrecorded, SQL Server raises an "already exists" error and the
 * transaction rolls back; verify the schema and baseline it instead.
 *
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.up = async (query) => {
  await query(`
    CREATE TABLE dbo.template_keys (
      id INT IDENTITY(1,1) NOT NULL CONSTRAINT template_keys_pkey PRIMARY KEY,
      template_id INT NOT NULL,
      property_key NVARCHAR(100) NOT NULL,
      property_value NVARCHAR(MAX) NULL,
      data_type NVARCHAR(10) NOT NULL,
      created_at DATETIME2(3) NOT NULL CONSTRAINT template_keys_created_at_default DEFAULT SYSDATETIME(),
      updated_at DATETIME2(3) NOT NULL CONSTRAINT template_keys_updated_at_default DEFAULT SYSDATETIME()
    );
  `);

  await query(`
    ALTER TABLE dbo.template_keys
      ADD CONSTRAINT template_keys_template_id_property_key_unique UNIQUE (template_id, property_key);
  `);

  await query(`
    ALTER TABLE dbo.template_keys
      ADD CONSTRAINT template_keys_data_type_check
      CHECK (data_type IN ('string', 'boolean', 'number', 'array', 'object'));
  `);

  await query(`
    ALTER TABLE dbo.template_keys
      ADD CONSTRAINT template_keys_template_id_foreign
      FOREIGN KEY (template_id) REFERENCES dbo.templates (id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  `);
};

/**
 * @param {import('../../src/Persistence/Migrator').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.down = async (query) => {
  await query(`IF OBJECT_ID('dbo.template_keys', 'U') IS NOT NULL DROP TABLE dbo.template_keys;`);
};
