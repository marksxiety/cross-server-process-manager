import type { MetricChartSeries, PrometheusSeries } from "@/types/prometheus";

export interface MetricChartSeriesOptions {
    color: string | ((series: PrometheusSeries, index: number) => string);
    label?: (series: PrometheusSeries, index: number) => string;
    stepped?: boolean;
    filled?: boolean;
    dashed?: boolean;
    valueMapper?: (value: number) => number | string;
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
