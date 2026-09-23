/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
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
  })

  // Natural key required by the seeder's ON CONFLICT upsert. The composite
  // index also covers template_id lookups and cascades.
  pgm.addConstraint('template_keys', 'template_keys_template_id_property_key_unique', {
    unique: ['template_id', 'property_key'],
  })

  pgm.addConstraint('template_keys', 'template_keys_data_type_check', {
    check: "data_type IN ('string', 'boolean', 'number', 'array', 'object')",
  })
}

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropConstraint('template_keys', 'template_keys_data_type_check')
  pgm.dropConstraint('template_keys', 'template_keys_template_id_property_key_unique')
  pgm.dropColumns('template_keys', ['is_hidden', 'is_locked'])
}
