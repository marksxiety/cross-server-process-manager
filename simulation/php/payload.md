# php-sim — register payload

Log loop (`worker.php`) run by PHP's CLI (`php worker.php`). Unlike the
seeded **PHP** template (which inverts to `script: php.exe` + `interpreter: none`
so `php -S ...` flags land before the script), a plain CLI script uses the
normal form: `script` is the `.php` file, `interpreter` is the `php.exe` path.

## Postman

| | |
|---|---|
| Method | `POST` |
| URL | `{{agentBaseUrl}}/pm2/start` (e.g. `http://localhost:3001/pm2/start`) |
| Headers | `Content-Type: application/json` |
| Body | raw JSON (below) |

> Replace `C:\path\to\x-process-manager` with the absolute path to your checkout on the machine the agent runs on.

## PHP template → `php-sim`

```json
{
  "name": "php-sim",
  "targetOs": "win32",
  "cwd": "C:\\path\\to\\x-process-manager\\simulation\\php",
  "script": "worker.php",
  "interpreter": "C:\\php\\php.exe",
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
