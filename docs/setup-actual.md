# XPM Setup — Connect Your Servers

Everything needed to run the registry API (`xpm-server`), the dashboard (`xpm-web`), and connect the servers you want to monitor.

> Just want to see it first? Run the [interactive demo](./setup-demo.md) — no database or agents required.

> The dashboard talks to [`xpm-agent`](https://github.com/marksxiety/xpm-agent) — one agent per monitored server. XPM itself never touches PM2 directly.

## Prerequisites

- **Node.js** and **PostgreSQL** — for the registry and dashboard.
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
| `DB_USER` / `DB_PASSWORD` / `DB_HOST` / `DB_PORT` / `DB_NAME` | PostgreSQL connection for the registry. | `postgres` / — / `localhost` / `5432` / `XPM` |
| `DB_MAINTENANCE_NAME` | Admin database used to run `CREATE DATABASE`. | `postgres` |
| `VITE_WEB_PORT` | Port the dashboard is served on (Vite dev/preview and the PM2 serve process). | `3000` |
| `VITE_SERVER_PROTOCOL` / `VITE_SERVER_HOST` / `VITE_SERVER_PORT` | Where the browser reaches the registry. `VITE_SERVER_PORT` must match `SERVER_PORT`. | `http` / `localhost` / `5638` |
| `VITE_AGENT_AUTH_TOKEN` | Bearer token the dashboard sends with every agent request. Must match the `AUTH_TOKEN` configured on each agent. | empty |

> `VITE_*` values are baked into the dashboard at build time — restart the dev server (or rebuild) after changing them. `.env` is gitignored; never commit real credentials.

## 4. Create and migrate the database

```bash
npm run db:setup -w server
```

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
npm install serve        # static file server used by the xpm-web PM2 entry
npm run build
pm2 start ecosystem.config.js
pm2 save
```

`ecosystem.config.js` loads the root `.env` and runs `xpm-server` (Node) and `xpm-web` (static `serve` on `VITE_WEB_PORT`). Rebuild the dashboard whenever `VITE_*` values change.
