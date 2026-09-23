/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = async (pgm) => {
  pgm.addColumns('template_keys', {
    is_hidden: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    is_locked: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
  }, { ifNotExists: true })

  // addConstraint has no ifNotExists option in node-pg-migrate v9, so guard
  // manually against the pg catalog. This makes re-runs safe without
  // hiding real schema drift.
  const hasUnique = await pgm.db.query(
    "SELECT 1 FROM pg_constraint WHERE conname = 'template_keys_template_id_property_key_unique'"
  )
  if (hasUnique.rowCount === 0) {
    // Natural key required by the seeder's ON CONFLICT upsert. The composite
    // index also covers template_id lookups and cascades.
    pgm.addConstraint('template_keys', 'template_keys_template_id_property_key_unique', {
      unique: ['template_id', 'property_key'],
    })
  }

  const hasCheck = await pgm.db.query(
    "SELECT 1 FROM pg_constraint WHERE conname = 'template_keys_data_type_check'"
  )
  if (hasCheck.rowCount === 0) {
    pgm.addConstraint('template_keys', 'template_keys_data_type_check', {
      check: "data_type IN ('string', 'boolean', 'number', 'array', 'object')",
    })
  }
}

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropConstraint('template_keys', 'template_keys_data_type_check', { ifExists: true })
  pgm.dropConstraint('template_keys', 'template_keys_template_id_property_key_unique', { ifExists: true })
  pgm.dropColumns('template_keys', ['is_hidden', 'is_locked'], { ifExists: true })
}
