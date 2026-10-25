# XPM Setup — Connect Your Servers

Everything needed to run the registry API (`xpm-server`), the dashboard (`xpm-web`), and connect the servers you want to monitor.

> Just want to see it first? Run the [interactive demo](./setup-demo.md) — no database or agents required.

> The dashboard talks to [`xpm-agent`](https://github.com/marksxiety/xpm-agent) — one agent per monitored server. XPM itself never touches PM2 directly.

## Prerequisites

- **Node.js** and **SQL Server** (Express or Developer edition works) — for the registry and dashboard.
- **[xpm-agent](https://github.com/marksxiety/xpm-agent)** — deploy it from its own repo on every server you want to monitor (it requires **Bun** and **PM2**; see the [agent setup guide](https://github.com/marksxiety/xpm-agent/blob/main/docs/SETUP.md)).

## 1. Install xpm-agent on each monitored server

```bash
git clone https://github.com/marksxiety/xpm-agent
cd xpm-agent && bun install && bun run start
```

Set `AUTH_TOKEN` in the agent's `.env` (required — the agent refuses to boot without it) and add every dashboard origin to its `CORS_ORIGIN`. Full details: [xpm-agent SETUP.md](https://github.com/marksxiety/xpm-agent/blob/main/docs/SETUP.md).

## 2. Clone XPM and install dependencies

```bash
git clone https://github.com/marksxiety/cross-server-process-manager
cd cross-server-process-manager && npm install
```

## 3. Configure the environment

```bash
cp .env.example .env   # Windows: copy .env.example .env
```

Both `xpm-server` and the `xpm-web` build read the same root `.env`:

| Variable | Purpose | Default |
|---|---|---|
| `SERVER_PORT` | Port the registry API binds. **Required** — the server refuses to boot without it. | `5638` |
| `DB_CONNECTION` | Database driver for the registry. Only `sqlsrv` is supported. | `sqlsrv` |
| `DB_HOST` / `DB_PORT` / `DB_DATABASE` | SQL Server connection for the registry. | `127.0.0.1` / `1433` / `backend` |
| `DB_USERNAME` / `DB_PASSWORD` | SQL login used by the registry. Create a login (e.g. `root`, or the built-in `sa`) with `dbcreator` rights so `db:setup` can create the database. | `root` / — |
| `DB_ENCRYPT` / `DB_TRUST_SERVER_CERTIFICATE` | TLS options. Local dev with a self-signed certificate: `false` / `true`. Remote or Azure SQL: `true` / `false`. | `false` / `true` |
| `VITE_WEB_PORT` | Port the dashboard is served on (Vite dev/preview and the PM2 serve process). | `3000` |
| `VITE_SERVER_PROTOCOL` / `VITE_SERVER_HOST` / `VITE_SERVER_PORT` | Where the browser reaches the registry. `VITE_SERVER_PORT` must match `SERVER_PORT`. | `http` / `localhost` / `5638` |
| `VITE_AGENT_AUTH_TOKEN` | Bearer token the dashboard sends with every agent request. Must match the `AUTH_TOKEN` configured on each agent. | empty |

> `VITE_*` values are baked into the dashboard at build time — restart the dev server (or rebuild) after changing them. `.env` is gitignored; never commit real credentials.

## 4. Create and migrate the database

For a fresh database:

```bash
npm run db:setup -w server
```

This creates the `DB_DATABASE` database (via the `master` database), runs the migrations, and seeds the starter templates. Applied migrations are recorded in `dbo.migrations`, which is created automatically and never dropped by `db:migrate` or `db:migrate:rollback`.

### Existing database

Migrations are strict: if a table, column, or constraint already exists while its migration is not recorded in `dbo.migrations`, `db:migrate` stops with an "already exists" error instead of silently skipping it. Verify the schema, then baseline the matching migration:

```bash
# Mark one migration as applied without running it
npm run db:migrate:baseline -w server -- 1789879705046_create-servers-table.js

# Or mark every unrecorded migration as applied
npm run db:migrate:baseline -w server -- --all
```

Use `--all` only when the whole schema predates the journal. Then apply anything still pending:

```bash
npm run db:migrate -w server
```

Roll back the most recently applied migration:

```bash
npm run db:migrate:rollback -w server
```

For local SQL Server, make sure TCP/IP is enabled on `DB_PORT` (default `1433`) and SQL Server authentication is allowed.

## 5. Start the registry and the dashboard

```bash
npm run dev
```

This runs both workspaces together — the registry on `SERVER_PORT` and the dashboard on `VITE_WEB_PORT`. To run them separately:

```bash
npm run dev:server
npm run dev:web
```

## 6. Register your servers

Open the dashboard, go to **Servers**, and register each host running `xpm-agent` (protocol, host, and the agent's port — `4000` by default). Your processes appear on the **Dashboard** page automatically.

## Running in production

Build both workspaces, then start them under PM2:

```bash
npm install
npm run build
pm2 start ecosystem.config.js
pm2 save
```

`ecosystem.config.js` loads the root `.env` and runs `xpm-server` (Node) and `xpm-web` (`vite preview` on `VITE_WEB_PORT`). Install with devDependencies on the host — the `xpm-web` process runs Vite. Rebuild the dashboard whenever `VITE_*` values change.
