import { formatBytes, formatUptime } from "@/lib/format";
import type {
    MetricsRange,
    MetricsScope,
    ProcessMetricName,
    PrometheusPoint,
    PrometheusSeries,
    PrometheusTarget,
    ResolvedMetricsRange,
} from "@/types/prometheus";

export const PROMETHEUS_SERVER_LABEL = "app";
export const PROMETHEUS_RETENTION_MS = 15 * 24 * 60 * 60 * 1000;
export const MAX_DATA_POINTS = 500;
export const MIN_STEP_SECONDS = 15;
export const DEFAULT_METRICS_REFRESH_MS = 30_000;
export const DEFAULT_METRICS_RANGE: MetricsRange = {
    kind: "relative",
    durationMs: 60 * 60 * 1000,
};

export const PROCESS_METRICS: ProcessMetricName[] = [
    "pm2_cpu",
    "pm2_memory",
    "pm2_uptime",
    "pm2_start_time_seconds",
    "pm2_restarts_total",
    "pm2_unstable_restarts_total",
    "pm2_status",
];

export interface MetricsRangePreset {
    value: string;
    label: string;
    shortLabel: string;
    durationMs: number;
}

export const METRICS_RANGE_PRESETS: MetricsRangePreset[] = [
    {
        value: "5m",
        label: "Last 5 minutes",
        shortLabel: "5m",
        durationMs: 5 * 60 * 1000,
    },
    {
        value: "15m",
        label: "Last 15 minutes",
        shortLabel: "15m",
        durationMs: 15 * 60 * 1000,
    },
    {
        value: "1h",
        label: "Last 1 hour",
        shortLabel: "1h",
        durationMs: 60 * 60 * 1000,
    },
    {
        value: "6h",
        label: "Last 6 hours",
        shortLabel: "6h",
        durationMs: 6 * 60 * 60 * 1000,
    },
    {
        value: "24h",
        label: "Last 24 hours",
        shortLabel: "24h",
        durationMs: 24 * 60 * 60 * 1000,
    },
    {
        value: "7d",
        label: "Last 7 days",
        shortLabel: "7d",
        durationMs: 7 * 24 * 60 * 60 * 1000,
    },
];

export const METRICS_REFRESH_OPTIONS: { value: string; label: string }[] = [
    { value: "0", label: "Off" },
    { value: "15000", label: "15s" },
    { value: "30000", label: "30s" },
    { value: "60000", label: "1m" },
    { value: "300000", label: "5m" },
];

export function normalizeMetricsRefreshMs(refreshMs: number): number {
    const match = METRICS_REFRESH_OPTIONS.some(
        (option) => Number(option.value) === refreshMs,
    );
    return match ? refreshMs : DEFAULT_METRICS_REFRESH_MS;
}

/** Status codes emitted by xpm-exporter. Never renumber or reuse them. */
export const PM2_STATUS_LABELS = [
    "unknown",
    "online",
    "launching",
    "stopping",
    "waiting restart",
    "stopped",
    "errored",
    "one-launch-status",
] as const;

const NICE_STEPS_SECONDS = [
    15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 21600, 43200, 86400,
];

export function escapeLabelValue(value: string): string {
    return value
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\r/g, "\\n")
        .replace(/\n/g, "\\n");
}

export function buildSelector(metric: ProcessMetricName, target: PrometheusTarget): string {
    const labels: string[] = [];

    if (target.name) labels.push(`name="${escapeLabelValue(target.name)}"`);
    if (target.namespace) labels.push(`namespace="${escapeLabelValue(target.namespace)}"`);
    if (target.server) {
        labels.push(`${PROMETHEUS_SERVER_LABEL}="${escapeLabelValue(target.server)}"`);
    }

    return labels.length > 0 ? `${metric}{${labels.join(",")}}` : metric;
}

export function buildServerSelector(
    metric: ProcessMetricName,
    target: { server: string; namespace?: string },
): string {
    const labels: string[] = [];

    if (target.server) {
        labels.push(`${PROMETHEUS_SERVER_LABEL}="${escapeLabelValue(target.server)}"`);
    }
    if (target.namespace) {
        labels.push(`namespace="${escapeLabelValue(target.namespace)}"`);
    }

    return labels.length > 0 ? `${metric}{${labels.join(",")}}` : metric;
}

export function buildSelectorForScope(
    metric: ProcessMetricName,
    scope: MetricsScope,
): string {
    if (scope.kind === "process") {
        return buildSelector(metric, scope);
    }

    return buildServerSelector(metric, scope);
}

export function formatSeriesLabel(series: PrometheusSeries): string {
    const name = series.metric.name ?? "unknown";
    const namespace = series.metric.namespace;

    return namespace ? `${namespace} · ${name}` : name;
}

export function computeStep(rangeMs: number): number {
    if (!Number.isFinite(rangeMs) || rangeMs <= 0) return MIN_STEP_SECONDS;

    const rawStep = rangeMs / 1000 / MAX_DATA_POINTS;
    return (
        NICE_STEPS_SECONDS.find((step) => step >= rawStep) ??
        Math.ceil(rawStep / 86400) * 86400
    );
}

export function resolveMetricsRange(
    range: MetricsRange,
    now = Date.now(),
): ResolvedMetricsRange {
    const end = range.kind === "relative" ? now : Math.min(range.end, now);
    const requestedStart =
        range.kind === "relative" ? end - range.durationMs : range.start;
    const earliest = now - PROMETHEUS_RETENTION_MS;
    const start = Math.max(requestedStart, earliest);
    const safeEnd = Math.max(end, start + 1000);

    return {
        start,
        end: safeEnd,
        step: computeStep(safeEnd - start),
    };
}

export function parseMatrixResult(result: unknown): PrometheusSeries[] {
    if (!Array.isArray(result)) return [];

    const series: PrometheusSeries[] = [];

    for (const entry of result) {
        if (typeof entry !== "object" || entry === null) continue;

        const candidate = entry as { metric?: unknown; values?: unknown };
        if (
            typeof candidate.metric !== "object" ||
            candidate.metric === null ||
            !Array.isArray(candidate.values)
        ) {
            continue;
        }

        const metric: Record<string, string> = {};
        for (const [key, value] of Object.entries(
            candidate.metric as Record<string, unknown>,
        )) {
            if (typeof value === "string") metric[key] = value;
        }

        const points: PrometheusPoint[] = [];
        for (const value of candidate.values) {
            if (!Array.isArray(value) || value.length < 2) continue;

            const timestamp = Number(value[0]);
            const sample = Number(value[1]);
            if (!Number.isFinite(timestamp) || !Number.isFinite(sample)) continue;

            points.push({ timestamp: timestamp * 1000, value: sample });
        }

        if (points.length === 0) continue;

        points.sort((a, b) => a.timestamp - b.timestamp);
        series.push({ metric, points });
    }

    return series;
}

export function lastPoint(series: PrometheusSeries[]): PrometheusPoint | null {
    let latest: PrometheusPoint | null = null;

    for (const entry of series) {
        for (const point of entry.points) {
            if (latest === null || point.timestamp > latest.timestamp) {
                latest = point;
            }
        }
    }

    return latest;
}

export function lastValue(series: PrometheusSeries[] | undefined): number | null {
    return series ? (lastPoint(series)?.value ?? null) : null;
}

export interface LatestSeriesPoint {
    series: PrometheusSeries;
    point: PrometheusPoint;
}

export function latestPoints(series: PrometheusSeries[]): LatestSeriesPoint[] {
    return series.flatMap((entry) => {
        const point = entry.points[entry.points.length - 1];
        return point ? [{ series: entry, point }] : [];
    });
}

export function sumLastValues(series: PrometheusSeries[]): number | null {
    const points = latestPoints(series);
    if (points.length === 0) return null;

    return points.reduce((total, entry) => total + entry.point.value, 0);
}

export function countByStatus(series: PrometheusSeries[]): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const { point } of latestPoints(series)) {
        const label = statusLabel(point.value);
        counts[label] = (counts[label] ?? 0) + 1;
    }

    return counts;
}

export function filterSeries(
    series: PrometheusSeries[],
    filter: { namespace?: string; query?: string },
): PrometheusSeries[] {
    const query = filter.query?.trim().toLowerCase() ?? "";

    return series.filter((entry) => {
        const namespace = entry.metric.namespace ?? "default";

        if (filter.namespace && namespace !== filter.namespace) return false;
        if (query === "") return true;

        return (
            (entry.metric.name ?? "").toLowerCase().includes(query) ||
            namespace.toLowerCase().includes(query)
        );
    });
}

export function statusLabel(code: number): string {
    const index = Math.trunc(code);
    return PM2_STATUS_LABELS[index] ?? PM2_STATUS_LABELS[0];
}

export function formatDurationSeconds(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
    return formatUptime(seconds * 1000);
}

export function formatMetricValue(metric: ProcessMetricName, value: number): string {
    switch (metric) {
        case "pm2_cpu":
            return `${value.toFixed(2)}%`;
        case "pm2_memory":
            return formatBytes(value);
        case "pm2_uptime":
            return formatDurationSeconds(value);
        case "pm2_start_time_seconds":
            return new Date(value * 1000).toLocaleString();
        case "pm2_restarts_total":
        case "pm2_unstable_restarts_total":
            return String(Math.trunc(value));
        case "pm2_status":
            return statusLabel(value);
    }
}

export function formatMetricAxisValue(
    metric: ProcessMetricName,
    value: number,
): string {
    switch (metric) {
        case "pm2_cpu":
            return `${Math.round(value)}%`;
        case "pm2_memory":
            return formatBytes(value);
        case "pm2_uptime":
            return formatDurationSeconds(value);
        case "pm2_restarts_total":
        case "pm2_unstable_restarts_total":
            return String(Math.trunc(value));
        default:
            return String(value);
    }
}

export function findRangePreset(durationMs: number): MetricsRangePreset | undefined {
    return METRICS_RANGE_PRESETS.find((preset) => preset.durationMs === durationMs);
}
