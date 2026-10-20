export type ProcessMetricName =
    | "pm2_cpu"
    | "pm2_memory"
    | "pm2_uptime"
    | "pm2_start_time_seconds"
    | "pm2_restarts_total"
    | "pm2_unstable_restarts_total"
    | "pm2_status";

export interface PrometheusTarget {
    name: string;
    namespace: string;
    server: string;
}

export type MetricsScope =
    | ({ kind: "process" } & PrometheusTarget)
    | { kind: "server"; server: string; namespace?: string };

export interface PrometheusPoint {
    /** Unix timestamp in milliseconds. */
    timestamp: number;
    value: number;
}

export interface PrometheusSeries {
    metric: Record<string, string>;
    points: PrometheusPoint[];
}

export interface ResolvedMetricsRange {
    /** Unix timestamp in milliseconds. */
    start: number;
    /** Unix timestamp in milliseconds. */
    end: number;
    /** Prometheus query step in seconds. */
    step: number;
}

export type MetricsRange =
    | { kind: "relative"; durationMs: number }
    | { kind: "absolute"; start: number; end: number };

export type MetricsData = Partial<Record<ProcessMetricName, PrometheusSeries[]>>;

export type MetricBasis = "server" | "process";

export interface MetricChartSeries {
    id: string;
    name: string;
    color: string;
    points: Array<[number, number | string]>;
    stepped?: boolean;
    filled?: boolean;
    dashed?: boolean;
}
