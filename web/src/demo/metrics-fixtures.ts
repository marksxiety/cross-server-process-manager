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
const HOST_CPU_CORES = 1;
const HOST_TOTAL_MEMORY = 16 * 1024 * MIB;

const SERVER_LOAD: Record<string, number> = {
    "prod-api-us": 70,
    "prod-edge-eu": 30,
    "staging-core": 10,
    "prod-worker-us": 55,
    "prod-cache-eu": 90,
};

const DEFAULT_SERVER_LOAD = 40;

const SERVER_DOMINANT: Record<string, string> = {
    "prod-api-us": "xpm-server",
    "prod-edge-eu": "api-gateway",
    "staging-core": "worker",
    "prod-worker-us": "xpm-web",
    "prod-cache-eu": "xpm-agent",
};

const DEFAULT_DOMINANT = "xpm-server";
const DOMINANT_WEIGHT = 6;
const OTHER_WEIGHTS = [3, 2, 1.5, 1.5, 1];
const PM2_HOST_SHARE = 0.9;

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

function between(seed: number, min: number, max: number): number {
    return min + (seed % (max - min + 1));
}

function serverLoad(server: string): number {
    return SERVER_LOAD[server] ?? DEFAULT_SERVER_LOAD;
}

function processWeight(server: string, processName: string): number {
    const dominant = SERVER_DOMINANT[server] ?? DEFAULT_DOMINANT;
    if (processName === dominant) return DOMINANT_WEIGHT;

    const others = SERVER_PROCESSES.filter(
        (process) => process.name !== dominant,
    );
    const index = others.findIndex((process) => process.name === processName);

    return OTHER_WEIGHTS[index] ?? 1;
}

function processBaseShare(server: string, processName: string): number {
    const totalWeight =
        DOMINANT_WEIGHT +
        OTHER_WEIGHTS.reduce((total, weight) => total + weight, 0);
    const weight = processWeight(server, processName);

    return (serverLoad(server) * PM2_HOST_SHARE * weight) / totalWeight;
}

function rangeProgress(
    timestamp: number,
    range: ResolvedMetricsRange,
): number {
    return (
        (timestamp - range.start) / Math.max(1, range.end - range.start)
    );
}

function trendPhase(seed: number, progress: number): number {
    const cycles = between(seed, 2, 4);
    const offset = (between(seed, 0, 359) * Math.PI) / 180;

    return progress * Math.PI * 2 * cycles + offset;
}

function processShare(
    seed: number,
    progress: number,
    baseShare: number,
): number {
    const phase = trendPhase(seed, progress);
    const direction = seed % 2 === 0 ? 1 : -1;
    const trend =
        (progress - 0.5) *
        (between(seed, 8, 16) / 100) *
        baseShare *
        direction;
    const wave = Math.sin(phase) * (between(seed, 5, 12) / 100) * baseShare;
    const detail =
        Math.sin(phase * 2.3) *
        (between(seed, 2, 5) / 100) *
        baseShare;

    return Math.min(100, Math.max(0, baseShare + trend + wave + detail));
}

function processCpuProfile(seed: number, progress: number): number {
    const phase = trendPhase(seed, progress);
    const direction = seed % 2 === 0 ? 1 : -1;
    const base = between(seed, 20, 55);
    const trend = (progress - 0.5) * between(seed, 8, 18) * direction;
    const wave =
        Math.sin(phase) * between(seed, 4, 9) +
        Math.sin(phase * 2.7) * between(seed, 1, 3);
    const spikeAt = between(seed, 15, 85) / 100;
    const spike =
        Math.exp(-Math.pow((progress - spikeAt) / 0.04, 2)) *
        between(seed, 8, 20);

    return Math.min(100, Math.max(0, base + trend + wave + spike));
}

function processMemoryProfile(seed: number, progress: number): number {
    const phase = trendPhase(seed, progress);
    const direction = seed % 2 === 0 ? 1 : -1;
    const baseMiB = between(seed, 3000, 8000);
    const trend =
        (progress - 0.5) * between(seed, 400, 1200) * direction;
    const wave = Math.sin(phase * 0.8) * between(seed, 100, 300);
    const sawtooth =
        ((progress * between(seed, 3, 6)) % 1) * between(seed, 200, 600);

    return Math.min(
        14336,
        Math.max(512, baseMiB + trend + wave + sawtooth),
    );
}

function sampleValue(
    metric: ProcessMetricName,
    timestamp: number,
    range: ResolvedMetricsRange,
    seed: number,
    baseShare: number,
    mode: "server" | "process",
): number {
    const startedAt = range.end - (2 * 60 + (seed % 240)) * MINUTE_MS;
    const elapsedMinutes = Math.max(0, timestamp - startedAt) / MINUTE_MS;
    const progress = rangeProgress(timestamp, range);

    switch (metric) {
        case "pm2_cpu":
            return mode === "process"
                ? processCpuProfile(seed, progress)
                : Math.min(
                      100,
                      processShare(seed, progress, baseShare) *
                          HOST_CPU_CORES,
                  );
        case "pm2_memory":
            return mode === "process"
                ? processMemoryProfile(seed, progress) * MIB
                : (processShare(seed, progress, baseShare) / 100) *
                      HOST_TOTAL_MEMORY;
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
    baseShare: number,
    mode: "server" | "process",
): PrometheusSeries {
    const seed = hash(
        `${scope.server}/${process.namespace}/${process.name}/${metric}`,
    );
    const stepMs = Math.max(1, range.step * 1000);
    const points: PrometheusPoint[] = [];

    for (let timestamp = range.start; timestamp <= range.end; timestamp += stepMs) {
        points.push({
            timestamp,
            value: sampleValue(
                metric,
                timestamp,
                range,
                seed,
                baseShare,
                mode,
            ),
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

function sampleHostValue(
    metric: HostMetricName,
    timestamp: number,
    range: ResolvedMetricsRange,
    seed: number,
    load: number,
): number {
    const progress = rangeProgress(timestamp, range);
    const phase = trendPhase(seed, progress);
    const direction = seed % 2 === 0 ? 1 : -1;
    const trend = (progress - 0.5) * between(seed, 4, 8) * direction;
    const wave =
        Math.sin(phase) * between(seed, 2, 5) +
        Math.sin(phase * 2.3) * between(seed, 1, 3);

    switch (metric) {
        case "host_cpu_usage_percent":
            return clampPercent(load + trend + wave);
        case "host_cpu_cores":
            return HOST_CPU_CORES;
        case "host_memory_usage_percent":
            return clampPercent(load + trend + wave);
        case "host_memory_total_bytes":
            return HOST_TOTAL_MEMORY;
    }
}

function seriesForHost(
    metric: HostMetricName,
    scope: { kind: "server"; server: string },
    range: ResolvedMetricsRange,
): PrometheusSeries {
    const load = serverLoad(scope.server);
    const seed = hash(`${scope.server}/${metric}`);
    const stepMs = Math.max(1, range.step * 1000);
    const points: PrometheusPoint[] = [];

    for (let timestamp = range.start; timestamp <= range.end; timestamp += stepMs) {
        points.push({
            timestamp,
            value: sampleHostValue(metric, timestamp, range, seed, load),
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

    const isShareMetric = metric === "pm2_cpu" || metric === "pm2_memory";

    if (scope.kind === "process") {
        return [
            seriesForProcess(metric, scope, range, scope, 0, "process"),
        ];
    }

    return SERVER_PROCESSES.filter(
        (process) => !scope.namespace || process.namespace === scope.namespace,
    ).map((process) => {
        const baseShare = isShareMetric
            ? processBaseShare(scope.server, process.name)
            : 0;
        return seriesForProcess(
            metric,
            scope,
            range,
            process,
            baseShare,
            "server",
        );
    });
}
