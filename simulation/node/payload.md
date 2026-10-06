# node-sim — register payloads

Log loop (`index.js`). Maps to the seeded **Node** (`node-sim`) and **npm**
(`npm-sim`) templates.

## Postman

| | |
|---|---|
| Method | `POST` |
| URL | `{{agentBaseUrl}}/pm2/start` (e.g. `http://localhost:3001/pm2/start`) |
| Headers | `Content-Type: application/json` |
| Body | raw JSON (below) |

> Replace `C:\path\to\x-process-manager` with the absolute path to your checkout on the machine the agent runs on.

## Node template → `node-sim`

```json
{
  "name": "node-sim",
  "targetOs": "win32",
  "cwd": "C:\\path\\to\\x-process-manager\\simulation\\node",
  "script": "index.js",
  "interpreter": "C:\\Program Files\\nodejs\\node.exe",
  "autorestart": true,
  "windowsHide": true
}
```

> Registering through the UI? Clear the Node template's prefilled
> `interpreter_args` (`--env-file=.env`), or create a `.env` file; Node exits if
> it is missing.

## npm template → `npm-sim`

```json
{
  "name": "npm-sim",
  "targetOs": "win32",
  "cwd": "C:\\path\\to\\x-process-manager\\simulation\\node",
  "script": "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
  "interpreter": "C:\\Program Files\\nodejs\\node.exe",
  "args": ["run", "dev"],
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
