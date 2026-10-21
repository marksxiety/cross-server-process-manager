import { useCallback, useMemo } from 'react'
import {
  toMetricChartSeries,
  type MetricChartSeriesOptions,
} from '@/lib/metric-chart'
import { findRestartTimestamps } from '@/lib/metric-restart'
import type { MetricsRangeResult } from '@/hooks/use-metrics-range'
import type {
  MetricChartSeries,
  PrometheusSeries,
} from '@/types/prometheus'

export type MetricChartSeriesBuilder = (
  seriesList: PrometheusSeries[] | undefined,
  options: Omit<MetricChartSeriesOptions, 'restarts' | 'stepMs'>,
) => MetricChartSeries[]

export function useMetricChartSeries(
  metrics: MetricsRangeResult,
): MetricChartSeriesBuilder {
  const uptime = metrics.data.pm2_uptime
  const startTime = metrics.data.pm2_start_time_seconds
  const restarts = useMemo(
    () =>
      findRestartTimestamps({
        pm2_uptime: uptime,
        pm2_start_time_seconds: startTime,
      }),
    [uptime, startTime],
  )
  const stepMs = metrics.range ? metrics.range.step * 1000 : undefined

  return useCallback(
    (seriesList, options) =>
      toMetricChartSeries(seriesList, { ...options, restarts, stepMs }),
    [restarts, stepMs],
  )
}
