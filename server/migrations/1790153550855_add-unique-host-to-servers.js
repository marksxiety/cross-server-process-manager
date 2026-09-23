exports.shorthands = undefined;

/**
 * Enforces UNIQUE(host) on servers, matching the application contract
 * (serverController HOST_UNIQUE_CONSTRAINT = 'servers_host_unique' and the
 * host_taken check on update).
 *
 * addConstraint has no ifNotExists option in node-pg-migrate v9, so the
 * pg_constraint guard makes re-runs safe (e.g. after clearing
 * pgmigrations and replaying). Also drops the interim
 * servers_host_port_unique composite if present.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = async (pgm) => {
  const hasComposite = await pgm.db.query(
    "SELECT 1 FROM pg_constraint WHERE conname = 'servers_host_port_unique'"
  );
  if (hasComposite.rowCount > 0) {
    pgm.dropConstraint('servers', 'servers_host_port_unique', { ifExists: true });
  }

  const hasUnique = await pgm.db.query(
    "SELECT 1 FROM pg_constraint WHERE conname = 'servers_host_unique'"
  );
  if (hasUnique.rowCount > 0) {
    return;
  }

  const dups = await pgm.db.query(
    `SELECT host, COUNT(*) AS n FROM servers
     GROUP BY host HAVING COUNT(*) > 1 LIMIT 5`
  );
  if (dups.rowCount > 0) {
    const detail = dups.rows.map((r) => `${r.host} x${r.n}`).join(', ');
    throw new Error(
      `Cannot add UNIQUE(host) to servers: duplicate hosts exist (${detail}). ` +
        `Dedupe those rows first, then re-run migrate:up.`
    );
  }

  pgm.addConstraint('servers', 'servers_host_unique', { unique: 'host' });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropConstraint('servers', 'servers_host_unique', { ifExists: true });
};
