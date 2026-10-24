import type { RestartTimestamps } from "@/lib/metric-restart";
import { formatSeriesLabel, seriesIdentity } from "@/lib/prometheus";
import type {
    MetricChartSeries,
    PrometheusPoint,
    PrometheusSeries,
} from "@/types/prometheus";

export interface MetricChartSeriesOptions {
    color: string | ((series: PrometheusSeries, index: number) => string);
    dashPattern?:
        | number[]
        | ((series: PrometheusSeries, index: number) => number[] | undefined);
    label?: (series: PrometheusSeries, index: number) => string;
    stepped?: boolean;
    filled?: boolean;
    dashed?: boolean;
    valueMapper?: (value: number) => number | string;
    stepMs?: number;
    restarts?: RestartTimestamps;
}

export type ProcessChartStyle = {
    color: string;
    dashPattern?: number[];
};

export const PROCESS_DASH_PATTERNS: Array<number[] | undefined> = [
    undefined,
    [6, 3],
    [2, 2],
    [8, 3, 2, 3],
];

export const GAP_STEP_FACTOR = 1.5;

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
 * Assigns a stable color and dash pattern to every process label in the
 * supplied data. Callers should pass the full metric data (before
 * namespace/search filtering) so filtering never changes an existing style.
 */
export function buildProcessStyleMap(
    seriesGroups: Iterable<PrometheusSeries[] | undefined>,
    palette: string[],
    dashPatterns: Array<number[] | undefined> = PROCESS_DASH_PATTERNS,
): Map<string, ProcessChartStyle> {
    const labels = new Set<string>();

    for (const seriesList of seriesGroups) {
        for (const series of seriesList ?? []) {
            labels.add(formatSeriesLabel(series));
        }
    }

    const styles = new Map<string, ProcessChartStyle>();
    const sorted = [...labels].sort();

    sorted.forEach((label, index) => {
        if (palette.length === 0) return;

        const color = palette[index % palette.length]!;
        const patternIndex =
            dashPatterns.length === 0
                ? -1
                : Math.floor(index / palette.length) % dashPatterns.length;

        styles.set(label, {
            color,
            dashPattern: patternIndex >= 0 ? dashPatterns[patternIndex] : undefined,
        });
    });

    return styles;
}

export function processStyleFor(
    series: PrometheusSeries,
    styleMap: Map<string, ProcessChartStyle>,
    fallback: ProcessChartStyle,
): ProcessChartStyle {
    return styleMap.get(formatSeriesLabel(series)) ?? fallback;
}

export function toMetricChartSeries(
    seriesList: PrometheusSeries[] | undefined,
    options: MetricChartSeriesOptions,
): MetricChartSeries[] {
    return (seriesList ?? [])
        .filter((series) => series.points.length > 0)
        .map((series, index) => {
            const name =
                options.label?.(series, index) ??
                series.metric.name ??
                "Process";
            const restarts =
                options.restarts?.get(seriesIdentity(series.metric)) ?? [];

            return {
                id: name,
                name,
                color:
                    typeof options.color === "function"
                        ? options.color(series, index)
                        : options.color,
                stepped: options.stepped,
                filled: options.filled,
                dashed: options.dashed,
                dashPattern:
                    typeof options.dashPattern === "function"
                        ? options.dashPattern(series, index)
                        : options.dashPattern,
                points: toChartPoints(series.points, options, restarts),
            };
        });
}


