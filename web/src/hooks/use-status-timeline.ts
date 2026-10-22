import { useMemo } from 'react'
import { findRestartTimestamps } from '@/lib/metric-restart'
import { buildStatusTimeline } from '@/lib/status-timeline'
import type { MetricsRangeResult } from '@/hooks/use-metrics-range'
import type {
  PrometheusSeries,
  StatusTimelineData,
  StatusTimelineProcess,
} from '@/types/prometheus'

export function useStatusTimeline(
  metrics: MetricsRangeResult,
  statusSeries: PrometheusSeries[],
  processes: StatusTimelineProcess[],
): StatusTimelineData {
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

  return useMemo(
    () =>
      buildStatusTimeline(statusSeries, processes, {
        restarts,
        range: metrics.range,
      }),
    [metrics.range, processes, restarts, statusSeries],
  )
}
