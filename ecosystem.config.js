const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const WEB_PORT = process.env.VITE_WEB_PORT || "3000";

module.exports = {
  apps: [
    {
      name: "xpm-server",
      namespace: "XPM",
      cwd: path.join(__dirname, "server"),
      script: "./dist/index.js",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,

      // Crash Recovery (Advanced)
      autorestart: true,
      max_restarts: 999999,
      exp_backoff_restart_delay: 100,
      min_uptime: "10s",

      // Memory Leak Protection (Advanced)
      max_memory_restart: "500M",

      // Graceful Shutdown & Logs (Advanced)
      kill_timeout: 5000,
      time: true,

      // Environment Configuration
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "xpm-web",
      namespace: "XPM",
      cwd: path.join(__dirname, "web"),
      script: "../node_modules/serve/build/main.js",
      args: `-s dist -l ${WEB_PORT}`,
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,

      // Crash Recovery (Advanced)
      autorestart: true,
      max_restarts: 999999,
      exp_backoff_restart_delay: 100,
      min_uptime: "10s",

      // Memory Leak Protection (Advanced)
      max_memory_restart: "250M",

      // Graceful Shutdown & Logs (Advanced)
      kill_timeout: 5000,
      time: true,

      // Environment Configuration
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};