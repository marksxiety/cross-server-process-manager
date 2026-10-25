const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const WEB_PORT = process.env.VITE_WEB_PORT || "3000";

module.exports = {
  apps: [
    {
      // Basic
      name: "xpm-server",
      namespace: "XPM",
      cwd: path.join(__dirname, "server"),
      interpreter: "node",
      script: "./dist/src/index.js",
      env: {
        NODE_ENV: "production"
      },

      // Advanced — Restart policy
      autorestart: true,
      max_restarts: 999999,
      min_uptime: "10s",
      restart_delay: 100,

      // Advanced — Resources & shutdown
      max_memory_restart: "500M",
      kill_timeout: 5000,

      // Advanced — Overrides
      time: true, // PM2-only, not in the process form catalog

      // Advanced — Scaling
      exec_mode: "fork",
      instances: 1
    },
    {
      // Basic
      name: "xpm-web",
      namespace: "XPM",
      cwd: path.join(__dirname, "web"),
      interpreter: "node",
      script: path.join(__dirname, "web", "preview.mjs"),
      env: {
        NODE_ENV: "production",
        VITE_WEB_PORT: WEB_PORT
      },

      // Advanced — Restart policy
      autorestart: true,
      max_restarts: 999999,
      min_uptime: "10s",
      restart_delay: 100,

      // Advanced — Resources & shutdown
      max_memory_restart: "250M",
      kill_timeout: 5000,

      // Advanced — Overrides
      time: true, // PM2-only, not in the process form catalog

      // Advanced — Scaling
      exec_mode: "fork",
      instances: 1
    }
  ]
};
