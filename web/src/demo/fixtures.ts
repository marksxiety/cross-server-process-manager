import type { ApiResponse } from "@/types/api";
import type {
    ProcessDescribe,
    ProcessDescribeDetails,
    ProcessLogs,
    ProcessStatus,
    ProcessSummary,
} from "@/types/process";
import type { RegisteredServer } from "@/types/server";
import type { SystemOverview } from "@/types/system";

const MS_PER_MINUTE = 60_000;
const MIB = 1_048_576;
const GIB = 1_073_741_824;
const DEFAULT_LOG_TAIL = 50;

const elapsed = (days: number, hours = 0, minutes = 0): number =>
    ((days * 24 + hours) * 60 + minutes) * MS_PER_MINUTE;

const SERVER_TOTAL_MEMORY = 16 * GIB;
const INTERPRETER = "C:\\Program Files\\nodejs\\node.exe";
const PM2_LOG_DIR = "C:\\Users\\Administrator\\.pm2\\logs";

function overviewOf(cpuUsagePercent: number, memoryPercentUsed: number): SystemOverview {
    const usedBytes = Math.round((SERVER_TOTAL_MEMORY * memoryPercentUsed) / 100);
    return {
        cpu: { usagePercent: cpuUsagePercent },
        memory: {
            totalBytes: SERVER_TOTAL_MEMORY,
            usedBytes,
            freeBytes: SERVER_TOTAL_MEMORY - usedBytes,
            percentUsed: memoryPercentUsed,
        },
    };
}

export const FIXTURE_SERVERS: RegisteredServer[] = [
    { id: 1, server: "prod-api-us", protocol: "http", host: "10.20.14.11", port: 4000, is_active: true },
    { id: 2, server: "prod-edge-eu", protocol: "http", host: "10.30.9.22", port: 4000, is_active: true },
    { id: 3, server: "staging-core", protocol: "http", host: "10.40.2.8", port: 4000, is_active: true },
    { id: 4, server: "prod-worker-us", protocol: "http", host: "10.20.14.12", port: 4000, is_active: true },
    { id: 5, server: "prod-cache-eu", protocol: "http", host: "10.30.9.23", port: 4000, is_active: true },
];

interface ProcessSpec {
    pmId: number;
    name: string;
    namespace: string;
    status: ProcessStatus;
    cpu: number;
    memory: number;
    uptime?: number;
    restarts?: number;
    unstableRestarts?: number;
    pid?: number;
    autorestart?: boolean;
    cronRestart?: string | null;
    exitCode?: number | null;
    execMode?: "fork_mode" | "cluster_mode";
    instances?: number;
}

function toSummary(server: RegisteredServer, spec: ProcessSpec): ProcessSummary {
    return {
        pid: spec.pid ?? (spec.status === "online" ? 1000 + spec.pmId * 37 : 0),
        pm_id: spec.pmId,
        name: spec.name,
        namespace: spec.namespace,
        status: spec.status,
        uptime: spec.uptime ?? 0,
        restarts: spec.restarts ?? 0,
        unstable_restarts: spec.unstableRestarts ?? 0,
        exec_mode: spec.execMode ?? "fork_mode",
        instances: spec.instances,
        interpreter: INTERPRETER,
        cpu: spec.cpu,
        memory: spec.memory,
        cwd: `C:\\apps\\${server.server}`,
        ip_address: "0.0.0.0",
        watch: false,
        autorestart: spec.autorestart ?? true,
        cron_restart: spec.cronRestart ?? null,
        exit_code: spec.exitCode ?? (spec.status === "online" ? null : 0),
    };
}

interface ServerFixture {
    overview: SystemOverview;
    processes: ProcessSummary[];
}

function buildServer(
    server: RegisteredServer,
    cpuUsagePercent: number,
    memoryPercentUsed: number,
    specs: ProcessSpec[],
): ServerFixture {
    return {
        overview: overviewOf(cpuUsagePercent, memoryPercentUsed),
        processes: specs.map((spec) => toSummary(server, spec)),
    };
}

const [prodApiUs, prodEdgeEu, stagingCore, prodWorkerUs, prodCacheEu] = FIXTURE_SERVERS;

const AGENTS: Record<string, ServerFixture> = {
    [`${prodApiUs.host}:${prodApiUs.port}`]: buildServer(prodApiUs, 34.2, 61, [
        {
            pmId: 0,
            name: "api-gateway",
            namespace: "production",
            status: "online",
            cpu: 12.4,
            memory: 412 * MIB,
            uptime: elapsed(23, 6, 14),
            restarts: 3,
            pid: 4820,
        },
        {
            pmId: 1,
            name: "auth-service",
            namespace: "production",
            status: "online",
            cpu: 4.8,
            memory: 268 * MIB,
            uptime: elapsed(12, 4, 51),
            restarts: 0,
            pid: 3164,
        },
        {
            pmId: 2,
            name: "checkout-worker",
            namespace: "workers",
            status: "errored",
            cpu: 0,
            memory: 96 * MIB,
            restarts: 24,
            unstableRestarts: 9,
        },
        {
            pmId: 3,
            name: "notification-service",
            namespace: "production",
            status: "errored",
            cpu: 0,
            memory: 72 * MIB,
            restarts: 17,
            unstableRestarts: 5,
        },
        {
            pmId: 4,
            name: "billing-cron",
            namespace: "workers",
            status: "stopped",
            cpu: 0,
            memory: 0,
            restarts: 62,
            cronRestart: "0 2 * * *",
            exitCode: 0,
        },
        {
            pmId: 5,
            name: "search-indexer",
            namespace: "workers",
            status: "stopped",
            cpu: 0,
            memory: 0,
            restarts: 5,
        },
        {
            pmId: 6,
            name: "feature-flags",
            namespace: "production",
            status: "stopped",
            cpu: 0,
            memory: 0,
            restarts: 1,
            autorestart: false,
            exitCode: 0,
        },
    ]),
    [`${prodEdgeEu.host}:${prodEdgeEu.port}`]: buildServer(prodEdgeEu, 82.4, 74, [
        {
            pmId: 0,
            name: "edge-proxy",
            namespace: "production",
            status: "online",
            cpu: 18.7,
            memory: 156 * MIB,
            uptime: elapsed(31, 2, 8),
            restarts: 0,
            pid: 2916,
        },
        {
            pmId: 1,
            name: "cdn-purge",
            namespace: "production",
            status: "stopped",
            cpu: 0,
            memory: 0,
            restarts: 11,
        },
        {
            pmId: 2,
            name: "session-store",
            namespace: "production",
            status: "waiting restart",
            cpu: 0.3,
            memory: 220 * MIB,
            restarts: 38,
            unstableRestarts: 7,
        },
        {
            pmId: 3,
            name: "image-resizer",
            namespace: "production",
            status: "degraded" as ProcessStatus,
            cpu: 61.2,
            memory: 776 * MIB,
            restarts: 9,
            unstableRestarts: 3,
            execMode: "cluster_mode",
            instances: 4,
            pid: 7431,
        },
        {
            pmId: 4,
            name: "websocket-hub",
            namespace: "production",
            status: "launching",
            cpu: 0,
            memory: 84 * MIB,
            restarts: 1,
        },
        {
            pmId: 5,
            name: "rate-limiter",
            namespace: "production",
            status: "stopping",
            cpu: 8.9,
            memory: 132 * MIB,
            restarts: 2,
            pid: 6118,
        },
    ]),
    [`${stagingCore.host}:${stagingCore.port}`]: buildServer(stagingCore, 12.1, 46, [
        {
            pmId: 0,
            name: "web-frontend",
            namespace: "staging",
            status: "online",
            cpu: 3.1,
            memory: 188 * MIB,
            uptime: elapsed(6, 11, 27),
            restarts: 2,
            pid: 2048,
        },
        {
            pmId: 1,
            name: "postgres-backup",
            namespace: "staging",
            status: "stopped",
            cpu: 0,
            memory: 0,
            restarts: 14,
            unstableRestarts: 2,
            autorestart: false,
            exitCode: 1,
        },
        {
            pmId: 2,
            name: "queue-consumer",
            namespace: "workers",
            status: "online",
            cpu: 22.6,
            memory: 344 * MIB,
            uptime: elapsed(4, 2, 55),
            restarts: 7,
            pid: 5142,
        },
        {
            pmId: 3,
            name: "redis-cache",
            namespace: "default",
            status: "online",
            cpu: 1.4,
            memory: 96 * MIB,
            uptime: elapsed(41, 7, 19),
            restarts: 0,
            pid: 1584,
        },
        {
            pmId: 4,
            name: "metrics-agent",
            namespace: "monitoring",
            status: "online",
            cpu: 0.8,
            memory: 64 * MIB,
            uptime: elapsed(9, 18, 3),
            restarts: 1,
            pid: 3327,
        },
    ]),
    [`${prodWorkerUs.host}:${prodWorkerUs.port}`]: buildServer(prodWorkerUs, 58.3, 67, [
        {
            pmId: 0,
            name: "pdf-renderer",
            namespace: "workers",
            status: "online",
            cpu: 31.7,
            memory: 512 * MIB,
            uptime: elapsed(8, 14, 6),
            restarts: 2,
            pid: 8814,
        },
        {
            pmId: 1,
            name: "email-dispatcher",
            namespace: "workers",
            status: "online",
            cpu: 6.2,
            memory: 148 * MIB,
            uptime: elapsed(8, 14, 5),
            restarts: 0,
            pid: 1196,
        },
        {
            pmId: 2,
            name: "retry-scheduler",
            namespace: "workers",
            status: "online",
            cpu: 2.9,
            memory: 112 * MIB,
            uptime: elapsed(8, 14, 5),
            restarts: 1,
            pid: 4402,
        },
        {
            pmId: 3,
            name: "report-builder",
            namespace: "workers",
            status: "online",
            cpu: 44.1,
            memory: 688 * MIB,
            uptime: elapsed(2, 3, 37),
            restarts: 5,
            pid: 9370,
        },
        {
            pmId: 4,
            name: "dead-letter-audit",
            namespace: "workers",
            status: "stopped",
            cpu: 0,
            memory: 0,
            restarts: 3,
        },
    ]),
    [`${prodCacheEu.host}:${prodCacheEu.port}`]: buildServer(prodCacheEu, 21.6, 52, [
        {
            pmId: 0,
            name: "redis-primary",
            namespace: "default",
            status: "online",
            cpu: 9.3,
            memory: 1229 * MIB,
            uptime: elapsed(64, 9, 42),
            restarts: 0,
            pid: 704,
        },
        {
            pmId: 1,
            name: "redis-replica",
            namespace: "default",
            status: "online",
            cpu: 5.7,
            memory: 1104 * MIB,
            uptime: elapsed(64, 9, 42),
            restarts: 0,
            pid: 1412,
        },
        {
            pmId: 2,
            name: "key-expiry",
            namespace: "workers",
            status: "online",
            cpu: 1.2,
            memory: 88 * MIB,
            uptime: elapsed(17, 5, 29),
            restarts: 2,
            pid: 2680,
        },
        {
            pmId: 3,
            name: "cache-warmer",
            namespace: "workers",
            status: "online",
            cpu: 14.8,
            memory: 224 * MIB,
            uptime: elapsed(17, 5, 28),
            restarts: 1,
            pid: 4536,
        },
        {
            pmId: 4,
            name: "sentinel-monitor",
            namespace: "monitoring",
            status: "online",
            cpu: 0.6,
            memory: 56 * MIB,
            uptime: elapsed(64, 9, 40),
            restarts: 0,
            pid: 918,
        },
    ]),
};

function logLine(time: string, message: string): string {
    return `2026-10-09T${time}: ${message}`;
}

const API_GATEWAY_LOGS: ProcessLogs = {
    out: [
        logLine("09:41:02", '{"level":"info","msg":"api-gateway listening on :8080"}'),
        logLine("09:41:07", "GET /v1/orders 200 34ms"),
        logLine("09:41:11", "GET /v1/products?page=2 200 12ms"),
        logLine("09:41:19", "POST /v1/checkout 201 87ms"),
        logLine("09:42:03", "GET /health 200 3ms"),
        logLine("09:42:15", "GET /v1/orders 200 29ms"),
        logLine("09:42:34", "upstream recovered — auth-service 200 18ms"),
    ],
    error: [
        logLine("09:42:18", "upstream timeout after 5000ms (auth-service)"),
        "    at GatewayProxy.forward (C:\\apps\\prod-api-us\\src\\proxy.ts:118:15)",
        "    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)",
        logLine("09:42:31", "retrying upstream connection (attempt 2/3)"),
    ],
};

const CHECKOUT_WORKER_LOGS: ProcessLogs = {
    out: [
        logLine("09:37:10", "checkout-worker started — queue=checkout concurrency=8"),
        logLine("09:38:41", "processing job #80412 (order 58231)"),
        logLine("09:39:02", "processing job #80413 (order 58234)"),
    ],
    error: [
        logLine("09:38:52", "Error: connect ECONNREFUSED 10.20.14.19:6379"),
        "    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1611:16)",
        "    at RedisClient.connect (C:\\apps\\prod-api-us\\node_modules\\redis\\dist\\client\\index.js:214:9)",
        logLine("09:38:53", "worker exiting with code 1"),
    ],
};

const LOG_TEMPLATES: Record<string, ProcessLogs> = {
    "api-gateway": API_GATEWAY_LOGS,
    "checkout-worker": CHECKOUT_WORKER_LOGS,
};

function genericLogs(summary: ProcessSummary): ProcessLogs {
    const out = [
        logLine("09:41:00", `${summary.name} started (pid ${summary.pid})`),
        logLine("09:41:05", "ready — waiting for work"),
        logLine("09:44:12", "heartbeat ok"),
        logLine("09:47:30", "heartbeat ok"),
    ];
    const error =
        summary.status === "errored" || summary.exit_code === 1
            ? [logLine("09:44:58", "unhandled rejection: connection reset by peer")]
            : [];
    return { out, error };
}

function logsFor(summary: ProcessSummary, tail: number): ProcessLogs {
    const template = LOG_TEMPLATES[summary.name] ?? genericLogs(summary);
    return {
        out: template.out?.slice(-tail) ?? [],
        error: template.error?.slice(-tail) ?? [],
    };
}

function describeFor(summary: ProcessSummary): ProcessDescribe {
    const describe: ProcessDescribeDetails = {
        version: "1.4.2",
        script_path: `${summary.cwd}\\dist\\index.js`,
        script_args: [],
        error_log_path: `${PM2_LOG_DIR}\\${summary.name}-error.log`,
        out_log_path: `${PM2_LOG_DIR}\\${summary.name}-out.log`,
        pid_path: `C:\\Users\\Administrator\\.pm2\\pids\\${summary.name}-${summary.pm_id}.pid`,
        interpreter_args: ["--max-old-space-size=512"],
        node_version: "22.14.1",
        node_env: "production",
        created_at: "2026-03-14T09:12:33.000Z",
        max_memory_restart: "512M",
        ...(summary.cron_restart ? { cron_restart: summary.cron_restart } : {}),
    };
    return {
        summary,
        describe,
        metrics: {
            "Loop delay": { historic: false, unit: "ms", type: "axm", value: 0.42 },
            "Heap size": { historic: false, unit: "MB", type: "axm", value: 48.2 },
            "Event loop latency": { historic: true, unit: "ms", type: "axm", value: 1.08 },
            "Active handles": { historic: false, type: "axm", value: 27 },
        },
    };
}

function ok<T>(info: T, message: string): ApiResponse<T> {
    return { success: true, message, info, status: 200 };
}

export function resolveFixture(endpoint: string, method: string): ApiResponse<unknown> | null {
    const url = new URL(endpoint);

    if (method === "GET" && url.pathname === "/servers") {
        return ok(FIXTURE_SERVERS, "Servers retrieved");
    }

    const agent = AGENTS[`${url.hostname}:${url.port}`];
    if (agent === undefined || method !== "GET") return null;

    if (url.pathname === "/pm2/list") {
        return ok(
            { overview: agent.overview, processes: agent.processes },
            "PM2 process list retrieved successfully",
        );
    }

    const describeMatch = /^\/pm2\/describe\/(\d+)$/.exec(url.pathname);
    if (describeMatch) {
        const summary = agent.processes.find((process) => process.pm_id === Number(describeMatch[1]));
        return summary ? ok(describeFor(summary), "Process description retrieved successfully") : null;
    }

    const logsMatch = /^\/pm2\/logs\/(\d+)$/.exec(url.pathname);
    if (logsMatch) {
        const summary = agent.processes.find((process) => process.pm_id === Number(logsMatch[1]));
        if (!summary) return null;
        const tail = Number(url.searchParams.get("tail")) || DEFAULT_LOG_TAIL;
        return ok(logsFor(summary, tail), "Process logs retrieved successfully");
    }

    return null;
}
