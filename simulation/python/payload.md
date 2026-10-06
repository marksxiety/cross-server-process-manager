# python-sim / python-venv-sim — register payloads

Log loop (`app.py`). Maps to the seeded **Python** (`python-sim`) and
**Python (venv)** (`python-venv-sim`) templates. No ports are bound, so both can
run at once.

## Postman

| | |
|---|---|
| Method | `POST` |
| URL | `{{agentBaseUrl}}/pm2/start` (e.g. `http://localhost:3001/pm2/start`) |
| Headers | `Content-Type: application/json` |
| Body | raw JSON (below) |

> Replace `C:\path\to\x-process-manager` with the absolute path to your checkout on the machine the agent runs on.

## Python template → `python-sim`

```json
{
  "name": "python-sim",
  "targetOs": "win32",
  "cwd": "C:\\path\\to\\x-process-manager\\simulation\\python",
  "script": "app.py",
  "interpreter": "C:\\Python312\\python.exe",
  "autorestart": true,
  "windowsHide": true
}
```

## Python (venv) template → `python-venv-sim`

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
  "windowsHide": true
}
```

## Expected schema (`POST /pm2/start`)

Required: `name`, `script`, `interpreter`, `targetOs`.

Optional: `namespace`, `cwd`, `args`, `interpreter_args`, `exec_mode`,
`instances`, `autorestart`, `max_restarts`, `windowsHide`, `env`, `watch`,
`ignore_watch`, `watch_delay`, `cron_restart`.

`targetOs` is `"win32" | "linux"` (the UI adds `win32`). Response: `200` with
the started process, or an error with `{ field, message }` issues.
