exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable(
    "servers",
    {
      id: "id", // Shorthand for a serial primary key
      server: {
        type: "varchar(100)",
        notNull: true,
        unique: true,
      },
      protocol: {
        type: "varchar(20)",
        notNull: true,
        default: "http",
      },
      host: {
        type: "varchar(255)",
        notNull: true,
      },
      port: {
        type: "integer",
        notNull: true,
      },
      is_active: {
        type: "boolean",
        notNull: true,
        default: true,
      },
      created_at: {
        type: "timestamp",
        notNull: true,
        default: pgm.func("current_timestamp"),
      },
      updated_at: {
        type: "timestamp",
        notNull: true,
        default: pgm.func("current_timestamp"),
      },
    },
    { ifNotExists: true }
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable("servers", { ifExists: true });
};
