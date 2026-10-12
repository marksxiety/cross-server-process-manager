/**
 * Per-field storage for template values: one row per PM2 option key.
 * `property_value` holds scalars as text and arrays/objects as JSON, while
 * `data_type` records the original type so values round-trip exactly.
 *
 * All statements are guarded against the system catalog so the migration is
 * replayable: when the migrations bookkeeping is recreated on an
 * existing database, every step must no-op instead of failing on existing
 * tables or constraints.
 *
 * @param {import('../src/scripts/migrate').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.up = async (query) => {
  await query(`
    IF OBJECT_ID('dbo.template_keys', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.template_keys (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT template_keys_pkey PRIMARY KEY,
        template_id INT NOT NULL,
        property_key NVARCHAR(100) NOT NULL,
        property_value NVARCHAR(MAX) NULL,
        data_type NVARCHAR(10) NOT NULL,
        created_at DATETIME2(3) NOT NULL CONSTRAINT template_keys_created_at_default DEFAULT SYSDATETIME(),
        updated_at DATETIME2(3) NOT NULL CONSTRAINT template_keys_updated_at_default DEFAULT SYSDATETIME()
      );
    END
  `);

  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'template_keys_template_id_property_key_unique')
      ALTER TABLE dbo.template_keys
        ADD CONSTRAINT template_keys_template_id_property_key_unique UNIQUE (template_id, property_key);
  `);

  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'template_keys_data_type_check')
      ALTER TABLE dbo.template_keys
        ADD CONSTRAINT template_keys_data_type_check
        CHECK (data_type IN ('string', 'boolean', 'number', 'array', 'object'));
  `);

  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'template_keys_template_id_foreign')
      ALTER TABLE dbo.template_keys
        ADD CONSTRAINT template_keys_template_id_foreign
        FOREIGN KEY (template_id) REFERENCES dbo.templates (id)
        ON DELETE CASCADE ON UPDATE CASCADE;
  `);
};

/**
 * @param {import('../src/scripts/migrate').MigrationContext} query
 * @returns {Promise<void>}
 */
exports.down = async (query) => {
  await query(`IF OBJECT_ID('dbo.template_keys', 'U') IS NOT NULL DROP TABLE dbo.template_keys;`);
};
