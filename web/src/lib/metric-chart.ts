import type { RestartTimestamps } from "@/lib/metric-restart";
import { seriesIdentity } from "@/lib/prometheus";
import type {
    MetricChartSeries,
    PrometheusPoint,
    PrometheusSeries,
} from "@/types/prometheus";

export interface MetricChartSeriesOptions {
    label?: (series: PrometheusSeries, index: number) => string;
    stepped?: boolean;
    filled?: boolean;
    valueMapper?: (value: number) => number | string;
    palette?: string[];
    stepMs?: number;
    restarts?: RestartTimestamps;
}

export const DASH_PATTERNS: Array<number[] | undefined> = [
    undefined,
    [6, 3],
    [2, 2],
    [8, 3, 2, 3],
];

export const GAP_STEP_FACTOR = 1.5;

function hashLabel(label: string): number {
    let hash = 2166136261;

    for (let index = 0; index < label.length; index += 1) {
        hash ^= label.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

export function paletteColorFor(
    label: string,
    palette: string[],
): string | undefined {
    if (palette.length === 0) return undefined;

    return palette[hashLabel(label) % palette.length];
}

export function paletteDashFor(label: string): number[] | undefined {
    return DASH_PATTERNS[hashLabel(`${label}|dash`) % DASH_PATTERNS.length];
}

type ChartPoint = [number, number | string | null];

export function maxNumericValue(series: MetricChartSeries[]): number {
    let max = 0;

    for (const entry of series) {
        for (const [, value] of entry.points) {
            if (typeof value === "number" && Number.isFinite(value) && value > max) {
                max = value;
            }
        }
    }

    return max;
}

const NICE_PERCENT_MAXIMA = [1, 2, 2.5, 5, 10, 20, 25, 50, 75, 100];

export function nicePercentMax(max: number, minimum = 1): number {
    const target = Math.max(minimum, Number.isFinite(max) ? max * 1.1 : minimum);
    return NICE_PERCENT_MAXIMA.find((value) => value >= target) ?? 100;
}

export function percentAxisFormatter(max: number): (value: number) => string {
    const decimals = max < 5 ? 1 : 0;
    return (value: number) => `${value.toFixed(decimals)}%`;
}

export function niceCpuProcessMax(max: number): number {
    if (!Number.isFinite(max) || max <= 100) return 100;

    const step = max <= 200 ? 50 : max <= 500 ? 100 : 250;
    return Math.ceil((max * 1.1) / step) * step;
}

function breakTimestamps(
    points: PrometheusPoint[],
    stepMs: number | undefined,
    restarts: number[],
): Map<number, number> {
    const breaks = new Map<number, number>();
    const gapThreshold =
        stepMs !== undefined && Number.isFinite(stepMs) && stepMs > 0
            ? stepMs * GAP_STEP_FACTOR
            : null;

    for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1]!;
        const current = points[index]!;
        const delta = current.timestamp - previous.timestamp;
        if (delta <= 0) continue;

        let breakAt: number | null = null;

        if (gapThreshold !== null && delta > gapThreshold) {
            breakAt = previous.timestamp + stepMs!;
        }

        const restart = restarts.find(
            (timestamp) =>
                timestamp > previous.timestamp &&
                timestamp <= current.timestamp,
        );

        if (restart !== undefined) {
            breakAt = breakAt === null ? restart : Math.min(breakAt, restart);
        }

        if (breakAt !== null) {
            breaks.set(index, Math.min(breakAt, current.timestamp));
        }
    }

    return breaks;
}

function toChartPoints(
    points: PrometheusPoint[],
    options: MetricChartSeriesOptions,
    restarts: number[],
): ChartPoint[] {
    const breaks = breakTimestamps(points, options.stepMs, restarts);
    const result: ChartPoint[] = [];

    for (let index = 0; index < points.length; index += 1) {
        const point = points[index]!;
        const breakAt = breaks.get(index);

        if (breakAt !== undefined) result.push([breakAt, null]);

        result.push([
            point.timestamp,
            options.valueMapper
                ? options.valueMapper(point.value)
                : point.value,
        ]);
    }

    return result;
}

/**
 * Builds chart-ready line series from Prometheus series.
 */
export function toMetricChartSeries(
    seriesList: PrometheusSeries[] | undefined,
    options: MetricChartSeriesOptions,
): MetricChartSeries[] {
    const entries = (seriesList ?? []).filter(
        (series) => series.points.length > 0,
    );
    const useDash =
        options.palette !== undefined &&
        entries.length > options.palette.length;

    return entries.map((series, index) => {
        const name =
            options.label?.(series, index) ??
            series.metric.name ??
            "Process";
        const restarts =
            options.restarts?.get(seriesIdentity(series.metric)) ?? [];

        return {
            id: name,
            name,
            color: options.palette
                ? paletteColorFor(name, options.palette)
                : undefined,
            dashPattern: useDash ? paletteDashFor(name) : undefined,
            stepped: options.stepped,
            filled: options.filled,
            points: toChartPoints(series.points, options, restarts),
        };
    });
}


