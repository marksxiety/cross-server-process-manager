export type ProcessStatus = "online" | "stopped" | "stopping" | "launching" | "errored";

export type ProcessCommand = "start" | "stop" | "restart" | "reload" | "delete";

export type ProcessCommandTarget = Pick<
    ProcessSummary,
    "pm_id" | "status" | "interpreter" | "exec_mode"
>;

export type LogStreamType = "both" | "output" | "error";

export interface StartIssue {
    field: string;
    message: string;
}

export interface StartProcessPayload {
    name: string;
    script: string;
    interpreter: string;
    targetOs?: "win32" | "linux";
    namespace?: string;
    cwd?: string;
    args?: string | string[];
    interpreter_args?: string | string[];
    exec_mode?: "fork" | "cluster";
    instances?: number | "max";
    autorestart?: boolean;
    max_restarts?: number;
    min_uptime?: string | number;
    restart_delay?: number;
    max_memory_restart?: string | number;
    increment_var?: string;
    kill_timeout?: number;
    windowsHide?: boolean;
    env?: Record<string, string>;
    watch?: boolean | string[];
    ignore_watch?: string[];
    watch_delay?: number;
    cron_restart?: string;
}

export type LogStream = "out" | "error";

export interface ProcessLogs {
    out?: string[];
    error?: string[];
}

export interface ProcessLogLine {
    id: number;
    stream: LogStream;
    /** ISO-ish prefix exactly as PM2 writes it, e.g. 2026-09-19T10:29:08. Null for continuation lines. */
    timestamp: string | null;
    message: string;
}

export interface ProcessSummary {
    pid: number;
    pm_id: number;
    name: string;
    namespace: string;
    status: ProcessStatus;
    /** Elapsed time in ms since the process last started; 0 when not online. */
    uptime: number;
    restarts: number;
    unstable_restarts: number;
    exec_mode: "fork_mode" | "cluster_mode";
    instances?: number;
    interpreter: string;
    cpu: number;
    memory: number;
    cwd?: string;
    ip_address: string;
    watch: boolean;
    autorestart?: boolean;
    logs?: { out: string[]; error: string[] };
}

export interface ProcessDescribeDetails {
    version: string | null;
    script_path: string | null;
    script_args: string | string[] | null;
    error_log_path: string | null;
    out_log_path: string | null;
    pid_path: string | null;
    interpreter_args: string[] | null;
    node_version: string | null;
    node_env: string | null;
    created_at: string | null;
    entire_log_path?: string;
    cron_restart?: string;
    max_memory_restart?: number | string;
}

export interface ProcessMetric {
    historic: boolean;
    unit?: string;
    type: string;
    value: string | number;
}

export interface ProcessDescribe {
    summary: ProcessSummary;
    describe: ProcessDescribeDetails;
    metrics: Record<string, ProcessMetric>;
}