import { isHostMetric, PROMETHEUS_SERVER_LABEL } from "@/lib/prometheus";
import type {
    HostMetricName,
    MetricName,
    MetricsScope,
    ProcessMetricName,
    PrometheusPoint,
    PrometheusSeries,
    ResolvedMetricsRange,
} from "@/types/prometheus";

const MIB = 1_048_576;
const MINUTE_MS = 60_000;
const HOST_CPU_CORES = 8;
const HOST_TOTAL_MEMORY = 16 * 1024 * MIB;

const HOST_BASELINES: Record<string, { cpu: number; memory: number }> = {
    "prod-api-us": { cpu: 34.2, memory: 61 },
    "prod-edge-eu": { cpu: 82.4, memory: 74 },
    "staging-core": { cpu: 12.1, memory: 46 },
    "prod-worker-us": { cpu: 58.3, memory: 67 },
    "prod-cache-eu": { cpu: 21.6, memory: 52 },
};

const DEFAULT_HOST_BASELINE = { cpu: 30, memory: 55 };

const SERVER_PROCESSES = [
    { name: "xpm-agent", namespace: "XPM" },
    { name: "xpm-exporter", namespace: "XPM" },
    { name: "xpm-server", namespace: "XPM" },
    { name: "xpm-web", namespace: "XPM" },
    { name: "api-gateway", namespace: "production" },
    { name: "worker", namespace: "production" },
];

function hash(value: string): number {
    let result = 0;

    for (let index = 0; index < value.length; index += 1) {
        result = (result * 31 + value.charCodeAt(index)) | 0;
    }

    return Math.abs(result);
}

function sampleValue(
    metric: ProcessMetricName,
    timestamp: number,
    range: ResolvedMetricsRange,
    seed: number,
): number {
    const phase = (timestamp / MINUTE_MS + (seed % 90)) / 7;
    const startedAt = range.end - (2 * 60 + (seed % 240)) * MINUTE_MS;
    const elapsedMinutes = Math.max(0, timestamp - startedAt) / MINUTE_MS;

    switch (metric) {
        case "pm2_cpu":
            return Math.max(
                0,
                4 +
                    (seed % 9) +
                    Math.sin(phase) * (2 + (seed % 3)) +
                    Math.sin(phase * 3.1) * 0.8,
            );
        case "pm2_memory":
            return (
                (120 + (seed % 300)) * MIB +
                Math.sin(phase) * 18 * MIB +
                ((timestamp - range.start) / Math.max(1, range.end - range.start)) *
                    12 *
                    MIB
            );
        case "pm2_uptime":
            return Math.max(0, (timestamp - startedAt) / 1000);
        case "pm2_start_time_seconds":
            return startedAt / 1000;
        case "pm2_restarts_total":
            return (seed % 5) + Math.floor(elapsedMinutes / 15);
        case "pm2_unstable_restarts_total":
            return (seed % 2) + Math.floor(elapsedMinutes / 45);
        case "pm2_status":
            return seed % 10;
    }
}

function seriesForProcess(
    metric: ProcessMetricName,
    scope: MetricsScope,
    range: ResolvedMetricsRange,
    process: { name: string; namespace: string },
): PrometheusSeries {
    const seed = hash(
        `${scope.server}/${process.namespace}/${process.name}/${metric}`,
    );
    const stepMs = Math.max(1, range.step * 1000);
    const points: PrometheusPoint[] = [];

    for (let timestamp = range.start; timestamp <= range.end; timestamp += stepMs) {
        points.push({
            timestamp,
            value: sampleValue(metric, timestamp, range, seed),
        });
    }

    return {
        metric: {
            __name__: metric,
            name: process.name,
            namespace: process.namespace,
            [PROMETHEUS_SERVER_LABEL]: scope.server,
        },
        points,
    };
}

function clampPercent(value: number): number {
    return Math.min(100, Math.max(0, value));
}

function hostBaseline(server: string): { cpu: number; memory: number } {
    return HOST_BASELINES[server] ?? DEFAULT_HOST_BASELINE;
}

function sampleHostValue(
    metric: HostMetricName,
    timestamp: number,
    baseline: { cpu: number; memory: number },
): number {
    const phase = timestamp / MINUTE_MS / 9;

    switch (metric) {
        case "host_cpu_usage_percent":
            return clampPercent(
                baseline.cpu + Math.sin(phase) * 6 + Math.sin(phase * 2.3) * 2,
            );
        case "host_cpu_cores":
            return HOST_CPU_CORES;
        case "host_memory_usage_percent":
            return clampPercent(baseline.memory + Math.sin(phase / 2) * 4);
        case "host_memory_total_bytes":
            return HOST_TOTAL_MEMORY;
    }
}

function seriesForHost(
    metric: HostMetricName,
    scope: { kind: "server"; server: string },
    range: ResolvedMetricsRange,
): PrometheusSeries {
    const baseline = hostBaseline(scope.server);
    const stepMs = Math.max(1, range.step * 1000);
    const points: PrometheusPoint[] = [];

    for (let timestamp = range.start; timestamp <= range.end; timestamp += stepMs) {
        points.push({
            timestamp,
            value: sampleHostValue(metric, timestamp, baseline),
        });
    }

    return {
        metric: {
            __name__: metric,
            [PROMETHEUS_SERVER_LABEL]: scope.server,
        },
        points,
    };
}

export function resolveMetricsFixture(
    metric: MetricName,
    scope: MetricsScope,
    range: ResolvedMetricsRange,
): PrometheusSeries[] {
    if (isHostMetric(metric)) {
        return scope.kind === "server" ? [seriesForHost(metric, scope, range)] : [];
    }

    if (scope.kind === "process") {
        return [seriesForProcess(metric, scope, range, scope)];
    }

    return SERVER_PROCESSES.filter(
        (process) => !scope.namespace || process.namespace === scope.namespace,
    ).map((process) => seriesForProcess(metric, scope, range, process));
}
