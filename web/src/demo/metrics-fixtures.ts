import { PROMETHEUS_SERVER_LABEL } from "@/lib/prometheus";
import type {
    ProcessMetricName,
    PrometheusPoint,
    PrometheusSeries,
    PrometheusTarget,
    ResolvedMetricsRange,
} from "@/types/prometheus";

const MIB = 1_048_576;
const MINUTE_MS = 60_000;

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
            return 1;
    }
}

export function resolveMetricsFixture(
    metric: ProcessMetricName,
    target: PrometheusTarget,
    range: ResolvedMetricsRange,
): PrometheusSeries[] {
    const seed = hash(`${target.server}/${target.namespace}/${target.name}/${metric}`);
    const stepMs = Math.max(1, range.step * 1000);
    const points: PrometheusPoint[] = [];

    for (let timestamp = range.start; timestamp <= range.end; timestamp += stepMs) {
        points.push({
            timestamp,
            value: sampleValue(metric, timestamp, range, seed),
        });
    }

    return [
        {
            metric: {
                __name__: metric,
                name: target.name,
                namespace: target.namespace,
                [PROMETHEUS_SERVER_LABEL]: target.server,
            },
            points,
        },
    ];
}
