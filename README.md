<h1 align="center">x-process-manager (XPM)</h1>

<p align="center"><b>Every server. Every process. One dashboard.</b></p>

<!-- <p align="center"><img src="docs/dashboard-preview.png" width="720" alt="XPM dashboard showing multiple servers and processes" /></p> -->

## The 2 AM problem

A application is down. You don't know which server it's on, so you SSH into the first one and run `pm2 list`. Not there. Second server. Not there either. By the time you find it on server four, you've opened four terminals, typed the same three commands sixteen times, and you're no closer to knowing *why* it crashed — just that it did.

Multiply that by however many boxes run your stack, and "checking on PM2" quietly becomes a tax you pay every incident.

### What PM2 is, for Context
PM2 is a process manager — the engine that keeps your apps alive in the background, restarts them when they crash, and tracks their logs and resource usage. If you run Node.js, Python, PHP, or background workers on a server, PM2 is very likely what's keeping them running. It's excellent at its job. It just only ever shows you one machine at a time.

### The Solution
**x-process-manager (XPM)** ends the hunt. It connects to every server running `xpm-agent` at once and pulls your entire fleet into a single browser window. No SSH. No memorized flags. One screen that tells you everything you'd otherwise log in five times to learn.

* **Fleet-wide Visibility:** View every running process, status, CPU load, and memory footprint across all nodes simultaneously.
* **Direct Control:** Start, restart, reload, stop, or flush logs across servers directly from the UI.
* **Unified Diagnostics:** Tail stdout and stderr streams across your fleet in real time.

## Quick start

```bash
# 1. Run xpm-agent on each server you want to monitor
git clone https://github.com/marksxiety/xpm-agent
cd xpm-agent && bun install && bun run start

# 2. Clone XPM and install dependencies for the dashboard and server workspace
git clone https://github.com/marksxiety/x-process-manager
cd x-process-manager && npm install

# 3. Create/migrate the database, then start the XPM server
npm run db:setup -w server
npm run dev -w server

# 4. In a second terminal, start the dashboard
npm run dev

# 5. Register your servers in the database, and watch your fleet appear
```

## What you can do

- **See your whole fleet at a glance** — every server, every process, on one dashboard
- **Spot trouble instantly** — health warnings and problem processes rise to the surface before you even click
- **Inspect anything, anywhere** — open any process and get its full story: how it's running, how it's been behaving, and what it's saying
- **Follow live logs** — watch stdout/stderr stream in as it happens, no terminal required
- **Register new services in minutes** — guided setup with ready-made templates and a production-ready config you can copy in one click
- **Watch it anywhere** — including fullscreen, for a dedicated ops screen

## What you can monitor

| Level | Metrics |
|---|---|
| **Server** | CPU load, memory usage, health status (online / warning / critical / offline) |
| **Process** | CPU %, memory, status, PID, uptime, restart & unstable-restart counts, exec mode, instances, interpreter, watch & autorestart flags, working directory |
| **Logs** | stdout / stderr, last 5–300 lines, optional auto-refresh |

## Built on

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS 4** + **shadcn/ui**
- **xpm-agent** — a Bun + Elysia service that drives **PM2**

## Roadmap

- **Templates** — a library of ready-made presets (e.g. a Node.js app) so registering a new service is a two-click job, not a form to fill from scratch
- **Register (simplified)** — pick a server and a template, then configure. That's it — no PM2 syntax to learn