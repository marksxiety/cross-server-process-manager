# XPM Setup Guide

Get XPM running and monitoring your servers in about 10 minutes.

> **Just want to look around first?** Try the [interactive demo](./setup-demo.md). No database or agents needed.

---

## Before You Start

- [ ] **Node.js** – Runtime for the XPM server.
- [ ] **SQL Server** – Database for application data.
- [ ] **SMTP** – Email service for account verification and password resets.
- [ ] **Windows, Bun, and PM2** – Required for monitoring target servers.
- [ ] **Secret Token** – Shared authentication token for secure communication.

---

## Step 1: Install the agent (on each monitored server)

```bash
git clone https://github.com/marksxiety/xpm-agent
cd xpm-agent && bun install
```

Create the agent's `.env` and set:

```env
AUTH_TOKEN=your-secret-token
CORS_ORIGIN=http://localhost:3000
```

- `AUTH_TOKEN` is required. The agent will not start without it.
- `CORS_ORIGIN` is the address of your dashboard. Add every dashboard address that will connect.

Then start it:

```bash
bun run start
```

The agent listens on port `4000`. Check that it is up by opening `http://<server-ip>:4000/` (a public banner) or the interactive API docs at `http://<server-ip>:4000/swagger`.

> **Keep it locked down.** The agent can launch scripts on its server, so treat the token like an SSH key. Use a strong `AUTH_TOKEN` and restrict network access to the agent port with a firewall. See the [agent security notes](https://github.com/marksxiety/xpm-agent/blob/main/docs/SECURITY.md).

More details: [agent setup guide](https://github.com/marksxiety/xpm-agent/blob/main/docs/SETUP.md).

---

## Step 2: Get XPM

```bash
git clone https://github.com/marksxiety/cross-server-process-manager
cd cross-server-process-manager && npm install
cp .env.example .env        # Windows: copy .env.example .env
```

Now open `.env`. You will fill it in piece by piece in Step 3.

---

## Step 3: Fill in `.env`

Each part below is small. Everything not mentioned has a working default.

### 3.1 Registry port and secret

```env
SERVER_PORT=5638
JWT_SECRET=any-random-string-at-least-32-characters-long
```

- Both are required. The server will not start without them.
- Keep `SERVER_PORT` at `5638` unless it is already in use.

### 3.2 Database

```env
DB_HOST=127.0.0.1
DB_PORT=1433
DB_DATABASE=backend
DB_USERNAME=sa
DB_PASSWORD=your-sql-password
```

- `DB_DATABASE` is the name of the database to create. It does not need to exist yet.
- The login needs `dbcreator` rights so Step 4 can create it. If you create the database manually, give the login `db_owner` on that database instead.
- Using **Azure SQL or a remote server** with proper TLS? Also set `DB_ENCRYPT=true` and `DB_TRUST_SERVER_CERTIFICATE=false`. For local development the defaults are fine.

### 3.3 Your admin account

```env
ADMIN_EMAIL=admin@example.com
ADMIN_NAME=Admin
ADMIN_PASSWORD=choose-a-strong-password
```

This account is created automatically when the server starts. You will use it to sign in. It is created already verified, so the first admin login works before SMTP is configured. Configure email before letting other users register.

### 3.4 Agent token

```env
VITE_AGENT_AUTH_TOKEN=your-secret-token
```

This must be **exactly the same** as the `AUTH_TOKEN` you set on the agent in Step 1.

### 3.5 Where the browser finds things (usually skip)

The defaults work for local use:

```env
VITE_WEB_PORT=3000
VITE_SERVER_PROTOCOL=http
VITE_SERVER_HOST=localhost
VITE_SERVER_PORT=5638
```

Only change these if you are using different ports or a different hostname. `VITE_SERVER_PORT` must match `SERVER_PORT`.

> **Important:** `VITE_*` values are baked in when the dashboard builds. Restart the dev server (or rebuild) after changing any of them.

### 3.6 Email (required for user accounts)

XPM uses email for account verification and password reset. Self-registered users cannot sign in until they open the verification link, and password reset also requires email.

For local development only, leave `MAIL_HOST` empty and the server prints the links to its console. In production (`NODE_ENV=production`), the server refuses to start without `MAIL_HOST`.

To send real emails:

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=you@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=you@gmail.com
```

| Provider                 | Host                    | Port  | Note                                                                                           |
| ------------------------ | ----------------------- | ----- | ---------------------------------------------------------------------------------------------- |
| Gmail / Google Workspace | `smtp.gmail.com`        | `587` | Turn on 2-Step Verification, then create an **App Password**. A normal password will not work. |
| Outlook.com              | `smtp-mail.outlook.com` | `587` | Use an App Password.                                                                           |
| Microsoft 365            | `smtp.office365.com`    | `587` | SMTP AUTH may be disabled. Enable it or use OAuth2.                                            |

`MAIL_FROM` defaults to `MAIL_USER` if left out.

### 3.7 Advanced (optional)

<details>
<summary>Token and link lifetimes, link base URL</summary>

| Variable                | What it does                                                                                                          | Default                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `JWT_EXPIRES_IN`        | Login lifetime in seconds (max `604800`)                                                                              | `43200` (12h)              |
| `AUTH_LINK_TTL_MINUTES` | How long email links stay valid                                                                                       | `30`                       |
| `AUTH_LINK_BASE_URL`    | Base URL used in emailed links. Set it only if your public dashboard URL differs (reverse proxy, different hostname). | built from `VITE_*` values |

</details>

---

## Step 4: Create the database

```bash
npm run db:setup -w server
```

That's it. It creates the database, runs the migrations, and adds the starter templates.

> Local SQL Server? Make sure TCP/IP is enabled on port `1433` and SQL Server authentication is allowed.

---

## Step 5: Start XPM

```bash
npm run dev
```

Open **http://localhost:3000** and sign in with the admin email and password from Step 3.3.

---

## Step 6: Add your servers

1. Open **Servers** in the dashboard.
2. Add each server running `xpm-agent`: protocol, host, and port (`4000` by default).
3. Open **Dashboard**. Your PM2 processes appear automatically. 🎉

---

## Troubleshooting

| Problem                                     | Fix                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Registry won't start                        | Check that `SERVER_PORT` and `JWT_SECRET` are set, and that `JWT_SECRET` has 32+ characters.     |
| Agent won't start                           | Set `AUTH_TOKEN` in the agent's `.env`.                                                          |
| `db:setup` can't create the database        | The SQL login needs `dbcreator` rights (or `db_owner` if the database already exists). Also check TCP/IP and SQL authentication are enabled. |
| Dashboard can't reach the registry          | `VITE_SERVER_PORT` must equal `SERVER_PORT`. Restart after changing `VITE_*` values.             |
| Dashboard can't reach an agent (CORS error) | Add the dashboard address to the agent's `CORS_ORIGIN`.                                          |
| Agent rejects requests                      | `VITE_AGENT_AUTH_TOKEN` must match the agent's `AUTH_TOKEN`.                                     |
| No verification email / users can't sign in | Set `MAIL_HOST` and valid SMTP credentials. For local development only, leave `MAIL_HOST` empty and read the link from the server console. |
| Emailed links open the wrong address        | Set `AUTH_LINK_BASE_URL` to your public dashboard URL.                                           |

---

## Build and run

### Development

```bash
npm run dev
```

This runs the dashboard and the registry together.

### Build both workspaces

```bash
npm run build
```

This runs `build:web` and `build:server` automatically — you do not need to build each workspace separately.

### Run the built app without PM2

```bash
npm run run:built
```

Run `npm run build` first. This then runs `vite preview` for the dashboard and `node dist/src/index.js` for the registry.

### Production under PM2

```bash
npm run build
pm2 start ecosystem.config.js
pm2 save
```

PM2 does not build. Run `npm run build` first. Install with devDependencies, and rebuild whenever a `VITE_*` value changes.

### Common commands

| Command | Purpose |
|---|---|
| `npm run dev` | Run the dashboard and registry in development |
| `npm run build` | Build both workspaces |
| `npm run run:built` | Run the built dashboard and registry |
| `pm2 start ecosystem.config.js` | Run production under PM2 |
| `npm run db:setup -w server` | Create the database, run migrations, seed |
| `npm run db:migrate -w server` | Apply pending migrations |

---

## Advanced: using an existing database

Only needed if your database already has tables but no migration history. `db:migrate` stops with an "already exists" error in that case.

Check that the schema matches, then mark migrations as applied:

```bash
# One migration
npm run db:migrate:baseline -w server -- 1789879705046_create-servers-table.js

# Or all unrecorded migrations (only if the whole schema already exists)
npm run db:migrate:baseline -w server -- --all

# Then apply anything still pending
npm run db:migrate -w server
```

To undo the most recent migration:

```bash
npm run db:migrate:rollback -w server
```
