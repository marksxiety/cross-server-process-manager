# See XPM Running in 60 Seconds

This is the **real dashboard**, rendered from bundled sample data — five servers and 28 processes, every PM2 status. No database, no agents, no configuration.

## What you'll see

- **Five sample servers** with health tones — healthy, warning, and critical tiles at a glance.
- **28 processes** covering every state: online, errored, failed exits, stopped, scheduled, launching, degraded, and completed.
- **Click any card** to open its full story — CPU, memory, uptime, restarts, exec details, and logs (`api-gateway` and `checkout-worker` have the richest).
- **Fullscreen mode** — hide the chrome and use it as a dedicated ops screen.

## Run it

```bash
git clone https://github.com/marksxiety/cross-server-process-manager
cd cross-server-process-manager
npm install
npm run dev:demo -w web
```

Then open the URL Vite prints (defaults to `http://localhost:5173` when no `.env` is present).

> Demo mode is fully sandboxed — it uses its own `-demo` caches and never touches real servers. The only difference from production is the data source: [`web/src/demo/fixtures.ts`](../web/src/demo/fixtures.ts).

## Ready for the real thing?

Follow [setup-actual.md](./setup-actual.md) to connect your own servers running [xpm-agent](https://github.com/marksxiety/xpm-agent).
