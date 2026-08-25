
export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    code?: string | undefined;
    info: T | null;
    status: number;
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
}

export interface Server {
    server: string;
    url: string
    data?: ProcessInfo[];
    alerts?: ServerAlert[];
}

export interface ServerAlert {
    type: "info" | "alert" | null | undefined;
    title: string;
    description: string;
}