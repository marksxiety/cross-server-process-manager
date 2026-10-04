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
  // Locking is a template-authoring concern the user must be able to override
  // at registration time, so the flag is no longer stored.
  pgm.dropColumn('template_keys', 'is_locked', { ifExists: true })
}

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.addColumn('template_keys', {
    is_locked: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
  }, { ifNotExists: true })
}
