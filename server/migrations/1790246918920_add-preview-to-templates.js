/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // Human-readable command the template represents (e.g. "npm run dev"),
  // surfaced on the template card. Nullable — a template may omit it.
  pgm.addColumn('templates', {
    preview: { type: 'varchar(255)', notNull: false },
  }, { ifNotExists: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumn('templates', 'preview', { ifExists: true });
};
