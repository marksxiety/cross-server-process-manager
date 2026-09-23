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
  pgm.createTable('template_keys', {
    id: 'id',
    template_id: {
      type: "integer",
      notNull: true,
      references: "templates(id)",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    property_key: {
      type: 'varchar(100)',
      notNull: true,
    },
    property_value: {
      type: 'text',
      notNull: false,
    },
    is_required: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    data_type: {
      type: 'varchar(10)',
      notNull: true,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  }, { ifNotExists: true })
}

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('template_keys', { ifExists: true })
}
