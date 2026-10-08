# python-sim — register payloads & status demos

Scripts in this folder:

| Script | Behavior | Statuses it exercises |
|---|---|---|
| `app.py` | 3 ticks (~6s), then crashes | Waiting Restart, Errored |
| `online.py` | tick loop forever | Online, Stopped (via UI Stop) |
| `one_shot.py` | prints once, exits 0 | Completed, Scheduled (Idle) |
| `crash.py` | crashes immediately (traceback, exit 1) | Errored, Waiting Restart, Failed (Exit ≠ 0) |

## Postman

| | |
|---|---|
| Method | `POST` |
| URL | `{{agentBaseUrl}}/pm2/start` (e.g. `http://localhost:3001/pm2/start`) |
| Headers | `Content-Type: application/json` |
| Body | raw JSON (below) |

> Replace `C:\path\to\x-process-manager` with the absolute path to your checkout
> on the machine the agent runs on, and point `interpreter` at your own
> `python.exe` (e.g. `C:\Program Files\Python313\python.exe`). The seeded
> **Python** template still references `C:\Python312\python.exe` — update it if
> that path does not exist on your host.

## Fast error path — `python-sim`

`app.py` crashes after 3 ticks (~6s). `min_uptime: 10000` makes every restart
count as unstable and `max_restarts: 3` stops the loop, so the dashboard walks
`online → errored` in roughly 20 seconds. Do not set `restart_delay` here: PM2
rewrites the final `errored` status to `waiting restart` when a restart delay is
configured (see the Errored section).

```json
{
  "name": "python-sim",
  "targetOs": "win32",
  "cwd": "C:\\path\\to\\x-process-manager\\simulation\\python",
  "script": "app.py",
  "interpreter": "C:\\Program Files\\Python313\\python.exe",
  "autorestart": true,
  "windowsHide": true,
  "min_uptime": 10000,
  "max_restarts": 3
}
```

## Python (venv) template — `python-venv-sim`

Create the venv once:

```powershell
py -3 -m venv venv
```

```json
{
  "name": "python-venv-sim",
  "targetOs": "win32",
  "cwd": "C:\\path\\to\\x-process-manager\\simulation\\python",
  "script": "app.py",
  "interpreter": "venv\\Scripts\\python.exe",
  "autorestart": true,
  "windowsHide": true,
  "min_uptime": 10000,
  "max_restarts": 3
}
```

## Status matrix

Every payload shares this base: `targetOs: "win32"`,
`cwd: "C:\\path\\to\\x-process-manager\\simulation\\python"`,
`interpreter: "C:\\Program Files\\Python313\\python.exe"`, `windowsHide: true`.

| Demo | Script | Extra fields |
|---|---|---|
| Online | `online.py` | `autorestart: true` |
| Stopped | `online.py` | none — press **Stop** in the UI |
| Waiting Restart | `app.py` | `min_uptime: 10000`, `restart_delay: 15000`, `max_restarts: 50` |
| Errored | `crash.py` | `min_uptime: 10000`, `max_restarts: 3` |
| Failed (Exit ≠ 0) | `crash.py` | `autorestart: false` |
| Completed | `one_shot.py` | `autorestart: false` |
| Scheduled (Idle) | `one_shot.py` | `autorestart: false`, `cron_restart: "*/1 * * * *"` |

### Online — `status-online`

```json
{
  "name": "status-online",
  "targetOs": "win32",
  "cwd": "C:\\path\\to\\x-process-manager\\simulation\\python",
  "script": "online.py",
  "interpreter": "C:\\Program Files\\Python313\\python.exe",
  "autorestart": true,
  "windowsHide": true
}
```

### Waiting Restart — `status-waiting-restart`

Crashes after ~6s, then holds `waiting restart` for 15s per cycle (amber,
pulsing). `max_restarts: 50` keeps the loop alive long enough to observe.

```json
{
  "name": "status-waiting-restart",
  "targetOs": "win32",
  "cwd": "C:\\path\\to\\x-process-manager\\simulation\\python",
  "script": "app.py",
  "interpreter": "C:\\Program Files\\Python313\\python.exe",
  "autorestart": true,
  "windowsHide": true,
  "min_uptime": 10000,
  "restart_delay": 15000,
  "max_restarts": 50
}
```

### Errored — `status-errored`

Crashes immediately; after 3 unstable restarts PM2 gives up and the badge stays
crimson (red, pulsing).

> `restart_delay` must be omitted for this demo. PM2's overlimit branch sets
> `errored` and then the restart-delay branch rewrites the status to
> `waiting restart` without scheduling another restart, leaving the process
> stuck there.

```json
{
  "name": "status-errored",
  "targetOs": "win32",
  "cwd": "C:\\path\\to\\x-process-manager\\simulation\\python",
  "script": "crash.py",
  "interpreter": "C:\\Program Files\\Python313\\python.exe",
  "autorestart": true,
  "windowsHide": true,
  "min_uptime": 10000,
  "max_restarts": 3
}
```

### Failed (Exit ≠ 0) — `status-failed-exit`

One crash with a non-zero exit code, no restart. The UI derives
`stopped + exit_code ≠ 0 + autorestart false` as **Failed (Exit ≠ 0)** (rose).
A manually stopped service (`autorestart: true`) is classified as **Stopped**
instead — Windows stops exit non-zero too (`taskkill`), so the exit code alone
cannot mean "crashed".

```json
{
  "name": "status-failed-exit",
  "targetOs": "win32",
  "cwd": "C:\\path\\to\\x-process-manager\\simulation\\python",
  "script": "crash.py",
  "interpreter": "C:\\Program Files\\Python313\\python.exe",
  "autorestart": false,
  "windowsHide": true
}
```

### Completed — `status-completed`

One clean run, no restart. The UI derives `stopped + exit_code 0 +
autorestart false` as **Completed** (teal).

```json
{
  "name": "status-completed",
  "targetOs": "win32",
  "cwd": "C:\\path\\to\\x-process-manager\\simulation\\python",
  "script": "one_shot.py",
  "interpreter": "C:\\Program Files\\Python313\\python.exe",
  "autorestart": false,
  "windowsHide": true
}
```

### Scheduled (Idle) — `status-scheduled-idle`

The job runs once per minute and PM2 leaves it `stopped` between runs; the UI
derives `stopped + cron_restart` as **Scheduled (Idle)** (violet).

```json
{
  "name": "status-scheduled-idle",
  "targetOs": "win32",
  "cwd": "C:\\path\\to\\x-process-manager\\simulation\\python",
  "script": "one_shot.py",
  "interpreter": "C:\\Program Files\\Python313\\python.exe",
  "autorestart": false,
  "windowsHide": true,
  "cron_restart": "*/1 * * * *"
}
```

## Not demonstrable

| Status | Why |
|---|---|
| Launching / Stopping (`launching`, `stopping`) | PM2 sets them for milliseconds (spawn/stop handshake) and Windows kills with `taskkill /T /F`; the dashboard auto-refreshes every 60s, so they only flash. |
| Degraded | Needs per-instance aggregation (X/Y) that the API and UI do not compute. |
| `one-launch-status` | Legacy PM2 constant; current PM2 never sets it. |
| `unknown` | Agent fallback when `pm2_env.status` is missing — not a real process state. |

## Expected schema (`POST /pm2/start`)

Required: `name`, `script`, `interpreter`, `targetOs`.

Optional: `namespace`, `cwd`, `args`, `interpreter_args`, `exec_mode`,
`instances`, `autorestart`, `max_restarts`, `min_uptime`, `restart_delay`,
`max_memory_restart`, `increment_var`, `kill_timeout`, `windowsHide`, `env`,
`watch`, `ignore_watch`, `watch_delay`, `cron_restart`.

`min_uptime` accepts milliseconds or duration strings (`"10s"`, `"500ms"`).
`targetOs` is `"win32" | "linux"` (the UI adds `win32`). Response: `200` with
the started process, or an error with `{ field, message }` issues.
