import { useMemo } from 'react'
import {
  useMetricsRange,
  type MetricsRangeResult,
} from '@/hooks/use-metrics-range'
import { HOST_DENOMINATOR_METRICS } from '@/lib/prometheus'
import type { MetricsRange, MetricsScope } from '@/types/prometheus'

type UseServerHostMetricsOptions = {
  serverName: string
  range: MetricsRange
  refreshMs: number
  enabled: boolean
}

export type ServerHostMetricsResult = MetricsRangeResult

/**
 * Host core count and RAM total for the "server" basis. Using Prometheus here
 * keeps process views on the same denominators as the server metrics page.
 */
export function useServerHostMetrics({
  serverName,
  range,
  refreshMs,
  enabled,
}: UseServerHostMetricsOptions): ServerHostMetricsResult {
  const scope = useMemo<MetricsScope | null>(
    () =>
      enabled && serverName !== ''
        ? { kind: 'server', server: serverName }
        : null,
    [enabled, serverName],
  )

  return useMetricsRange({
    scope,
    range,
    refreshMs,
    enabled,
    metricNames: HOST_DENOMINATOR_METRICS,
  })
}
