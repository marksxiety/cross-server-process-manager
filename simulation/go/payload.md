# go-sim — register payload

Log loop (`main.go`) run as a compiled binary. Maps to the seeded **Go**
template (`my-go-app.exe`).

## Build once

```powershell
.\build.ps1        # produces my-go-app.exe
```

`my-go-app.exe` is gitignored; build it on the machine the agent runs on.

## Postman

| | |
|---|---|
| Method | `POST` |
| URL | `{{agentBaseUrl}}/pm2/start` (e.g. `http://localhost:3001/pm2/start`) |
| Headers | `Content-Type: application/json` |
| Body | raw JSON (below) |

> `cwd` is absolute for this checkout; replace it if the agent runs elsewhere.

## Go template → `go-sim`

```json
{
  "name": "go-sim",
  "targetOs": "win32",
  "cwd": "C:\\Users\\markc\\Desktop\\DEVELOPMENT\\x-process-manager\\simulation\\go",
  "script": "my-go-app.exe",
  "interpreter": "none",
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
