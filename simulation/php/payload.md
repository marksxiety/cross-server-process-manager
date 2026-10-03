# php-sim — register payload

Log loop (`worker.php`) run by PHP's CLI. Maps to the seeded **PHP** template,
with `args` changed to run the script directly instead of `php -S`.

## Postman

| | |
|---|---|
| Method | `POST` |
| URL | `{{agentBaseUrl}}/pm2/start` (e.g. `http://localhost:3001/pm2/start`) |
| Headers | `Content-Type: application/json` |
| Body | raw JSON (below) |

> `cwd` is absolute for this checkout; replace it if the agent runs elsewhere.

## PHP template → `php-sim`

```json
{
  "name": "php-sim",
  "targetOs": "win32",
  "cwd": "C:\\Users\\markc\\Desktop\\DEVELOPMENT\\x-process-manager\\simulation\\php",
  "script": "C:\\php\\php.exe",
  "interpreter": "none",
  "args": ["worker.php"],
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
