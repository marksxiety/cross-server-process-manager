// Connection options for node-pg-migrate. Loaded via `-f` after `--envPath .env`,
// so the DB_* variables are already present in process.env.
module.exports = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT ?? 5432),
};
