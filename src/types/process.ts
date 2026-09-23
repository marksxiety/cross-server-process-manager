export type ProcessStatus = "online" | "stopped" | "stopping" | "launching" | "errored";

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