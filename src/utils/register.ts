import type { AdvancedConfig, BaseConfig } from "@/types";

export const EMPTY_BASE: BaseConfig = {
  name: "",
  namespace: "",
  cwd: "",
  script: "",
  args: "",
  interpreter: "",
  interpreter_args: "",
  exec_mode: "fork",
  instances: 1,
  autorestart: true,
  windowsHide: true,
  watch: false,
};

export const EMPTY_ADVANCED: AdvancedConfig = {
  max_restarts: 10,
  min_uptime: "",
  restart_delay: 0,
  exp_backoff_restart_delay: 0,
  max_memory_restart: "",
  kill_timeout: 1600,
  listen_timeout: 3000,
  wait_ready: false,
  shutdown_with_message: false,
  stop_exit_codes: "",
  kill_retry_time: 100,
  ignore_watch: "",
  watch_delay: 500,
  env: "",
  env_production: "",
  env_development: "",
  output: "",
  error: "",
  log_file: "",
  pid_file: "",
  merge_logs: false,
  log_date_format: "",
  time: false,
  combine_logs: false,
  disable_logs: false,
  cron_restart: "",
  vizion: true,
  post_update: "",
  force: false,
  source_map_support: false,
  instance_var: "",
  filter_env: "",
  increment_var: "",
};

export function splitArgs(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function parseEnvBlock(value: string): Record<string, string> | undefined {
  const lines = value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return undefined;
  const out: Record<string, string> = {};
  for (const line of lines) {
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return Object.keys(out).length ? out : undefined;
}

export function buildPayload(base: BaseConfig, advanced: AdvancedConfig) {
  const payload: Record<string, unknown> = {
    name: base.name || undefined,
    namespace: base.namespace || undefined,
    cwd: base.cwd || undefined,
    script: base.script || undefined,
    args: base.args ? splitArgs(base.args) : undefined,
    interpreter: base.interpreter || undefined,
    interpreter_args: base.interpreter_args
      ? splitArgs(base.interpreter_args)
      : undefined,
    exec_mode: base.exec_mode,
    instances: base.instances,
    autorestart: base.autorestart,
    windowsHide: base.windowsHide,
    watch: base.watch,
  };

  // Only include advanced keys that differ from an "unset" value, so the
  // payload stays close to the base shape unless the user opted in.
  if (advanced.max_restarts !== EMPTY_ADVANCED.max_restarts)
    payload.max_restarts = advanced.max_restarts;
  if (advanced.min_uptime) payload.min_uptime = advanced.min_uptime;
  if (advanced.restart_delay) payload.restart_delay = advanced.restart_delay;
  if (advanced.exp_backoff_restart_delay)
    payload.exp_backoff_restart_delay = advanced.exp_backoff_restart_delay;
  if (advanced.max_memory_restart)
    payload.max_memory_restart = advanced.max_memory_restart;
  if (advanced.kill_timeout !== EMPTY_ADVANCED.kill_timeout)
    payload.kill_timeout = advanced.kill_timeout;
  if (advanced.listen_timeout !== EMPTY_ADVANCED.listen_timeout)
    payload.listen_timeout = advanced.listen_timeout;
  if (advanced.wait_ready) payload.wait_ready = advanced.wait_ready;
  if (advanced.shutdown_with_message)
    payload.shutdown_with_message = advanced.shutdown_with_message;
  if (advanced.stop_exit_codes)
    payload.stop_exit_codes = splitArgs(advanced.stop_exit_codes).map(Number);
  if (advanced.kill_retry_time !== EMPTY_ADVANCED.kill_retry_time)
    payload.kill_retry_time = advanced.kill_retry_time;

  if (advanced.ignore_watch)
    payload.ignore_watch = splitArgs(advanced.ignore_watch);
  if (advanced.watch_delay !== EMPTY_ADVANCED.watch_delay)
    payload.watch_delay = advanced.watch_delay;

  const env = parseEnvBlock(advanced.env);
  const envProd = parseEnvBlock(advanced.env_production);
  const envDev = parseEnvBlock(advanced.env_development);
  if (env) payload.env = env;
  if (envProd) payload.env_production = envProd;
  if (envDev) payload.env_development = envDev;

  if (advanced.output) payload.output = advanced.output;
  if (advanced.error) payload.error = advanced.error;
  if (advanced.log_file) payload.log_file = advanced.log_file;
  if (advanced.pid_file) payload.pid_file = advanced.pid_file;
  if (advanced.merge_logs) payload.merge_logs = advanced.merge_logs;
  if (advanced.log_date_format)
    payload.log_date_format = advanced.log_date_format;
  if (advanced.time) payload.time = advanced.time;
  if (advanced.combine_logs) payload.combine_logs = advanced.combine_logs;
  if (advanced.disable_logs) payload.disable_logs = advanced.disable_logs;

  if (advanced.cron_restart) payload.cron_restart = advanced.cron_restart;
  if (!advanced.vizion) payload.vizion = advanced.vizion;
  if (advanced.post_update)
    payload.post_update = splitArgs(advanced.post_update);
  if (advanced.force) payload.force = advanced.force;
  if (advanced.source_map_support)
    payload.source_map_support = advanced.source_map_support;
  if (advanced.instance_var) payload.instance_var = advanced.instance_var;
  if (advanced.filter_env)
    payload.filter_env = splitArgs(advanced.filter_env);
  if (advanced.increment_var) payload.increment_var = advanced.increment_var;

  // Drop undefined keys for a clean preview.
  return Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined)
  );
}