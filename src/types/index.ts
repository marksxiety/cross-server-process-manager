
export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    code?: string | undefined;
    info: T | null;
    status: number;
}

export interface ProcessLogs {
    out?: string[];
    error?: string[];
}

export interface ProcessInfo {
    pid: number;
    pm_id: number;
    name: string;
    namespace: string;
    status: string;
    uptime: number;
    restarts: number;
    unstable_restarts: number;
    exec_mode: string;
    instances: number;
    interpreter: string;
    cpu: number;
    ip_address: string;
    memory: number;
    cwd: string;
    watch: boolean;
    autorestart: boolean;
    logs?: ProcessLogs;
}

export interface SystemOverview {
    cpu: {
        cores: number;
        model: string;
        loadAvg: number[];
    },
    memory: {
        totalBytes: number;
        freeBytes: number;
        usedBytes: number;
        percentUsed: number;
    }
}

export interface ServerListResponse {
    overview: SystemOverview;
    processes: ProcessInfo[];
}

export interface ServerInfo {
    id: string;
    name: string;
    ip_address: string;
    host?: SystemOverview;
    status?: "online" | "offline";
}

export interface Server {
    server: string;
    url: string
    data?: ProcessInfo[];
    alerts?: ServerAlert[];
    host?: SystemOverview;
}

export interface ServerAlert {
    type: "info" | "alert" | null | undefined;
    title: string;
    description: string;
}

export interface BaseConfig {
    name: string;
    namespace: string;
    cwd: string;
    script: string;
    args: string; // comma-separated in the UI, split to array on submit
    interpreter: string;
    interpreter_args: string;
    exec_mode: "fork" | "cluster";
    instances: number;
    autorestart: boolean;
    windowsHide: boolean;
    watch: boolean;
}

export interface AdvancedConfig {
    // Restart / crash handling
    max_restarts: number;
    min_uptime: string;
    restart_delay: number;
    exp_backoff_restart_delay: number;
    max_memory_restart: string;
    kill_timeout: number;
    listen_timeout: number;
    wait_ready: boolean;
    shutdown_with_message: boolean;
    stop_exit_codes: string;
    kill_retry_time: number;

    // Watch and ignore rules
    ignore_watch: string;
    watch_delay: number;

    // Environment
    env: string; // KEY=value per line
    env_production: string;
    env_development: string;

    // Logging
    output: string;
    error: string;
    log_file: string;
    pid_file: string;
    merge_logs: boolean;
    log_date_format: string;
    time: boolean;
    combine_logs: boolean;
    disable_logs: boolean;

    // Advanced / niche
    cron_restart: string;
    vizion: boolean;
    post_update: string;
    force: boolean;
    source_map_support: boolean;
    instance_var: string;
    filter_env: string;
    increment_var: string;
}

export interface Template {
    id: string;
    name: string;
    description: string;
    defaults: Partial<BaseConfig>;
}