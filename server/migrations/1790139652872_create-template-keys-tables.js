/**
 * Per-field storage for template values: one row per PM2 option key.
 * `property_value` holds scalars as text and arrays/objects as JSON, while
 * `data_type` records the original type so values round-trip exactly.
 * jsonb is deliberately avoided so the same logical tables can be recreated
 * on MSSQL later.
 *
 * All statements are raw SQL with catalog guards so the migration is
 * replayable: when the pgmigrations bookkeeping is recreated on an existing
 * database, every step must no-op instead of failing on existing tables or
 * constraints. It also converges pre-rewrite local databases by dropping the
 * legacy is_required/is_hidden/is_locked columns and templates.values jsonb.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = async (pgm) => {
  await pgm.db.query(`ALTER TABLE templates DROP COLUMN IF EXISTS values`)

  const existing = await pgm.db.query(`SELECT to_regclass('template_keys') AS name`)
  if (existing.rows[0]?.name) {
    await pgm.db.query(`
      ALTER TABLE template_keys
        DROP COLUMN IF EXISTS is_required,
        DROP COLUMN IF EXISTS is_hidden,
        DROP COLUMN IF EXISTS is_locked
    `)
  }

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS template_keys (
      id serial PRIMARY KEY,
      template_id integer NOT NULL REFERENCES templates(id) ON DELETE CASCADE ON UPDATE CASCADE,
      property_key varchar(100) NOT NULL,
      property_value text,
      data_type varchar(10) NOT NULL,
      created_at timestamp NOT NULL DEFAULT current_timestamp,
      updated_at timestamp NOT NULL DEFAULT current_timestamp
    )
  `)

  const hasUnique = await pgm.db.query(
    "SELECT 1 FROM pg_constraint WHERE conname = 'template_keys_template_id_property_key_unique'"
  )
  if (hasUnique.rowCount === 0) {
    await pgm.db.query(`
      ALTER TABLE template_keys
        ADD CONSTRAINT template_keys_template_id_property_key_unique UNIQUE (template_id, property_key)
    `)
  }

  const hasCheck = await pgm.db.query(
    "SELECT 1 FROM pg_constraint WHERE conname = 'template_keys_data_type_check'"
  )
  if (hasCheck.rowCount === 0) {
    await pgm.db.query(`
      ALTER TABLE template_keys
        ADD CONSTRAINT template_keys_data_type_check
        CHECK (data_type IN ('string', 'boolean', 'number', 'array', 'object'))
    `)
  }
}

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('template_keys', { ifExists: true })
}
