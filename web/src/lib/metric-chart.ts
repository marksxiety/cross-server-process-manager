import type {
    MetricChartSeries,
    PrometheusSeries,
} from "@/types/prometheus";

export interface MetricChartSeriesOptions {
    color: string | ((series: PrometheusSeries, index: number) => string);
    label?: (series: PrometheusSeries, index: number) => string;
    stepped?: boolean;
    filled?: boolean;
    dashed?: boolean;
    valueMapper?: (value: number) => number | string;
}

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
                points: series.points.map(
                    (point) =>
                        [
                            point.timestamp,
                            options.valueMapper
                                ? options.valueMapper(point.value)
                                : point.value,
                        ] as [number, number | string],
                ),
            };
        });
}


