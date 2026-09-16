export type ProcessStatus = "online" | "stopped" | "stopping" | "launching" | "errored";

export interface ProcessSummary {
    pid: number;
    pm_id: number;
    name: string;
    namespace: string;
    status: ProcessStatus;
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