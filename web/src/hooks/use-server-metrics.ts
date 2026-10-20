import { useMemo } from 'react'
import {
  useMetricsRange,
  type MetricsRangeResult,
} from '@/hooks/use-metrics-range'
import type { MetricsRange, MetricsScope } from '@/types/prometheus'

type UseServerMetricsOptions = {
  serverName: string
  range: MetricsRange
  refreshMs: number
  enabled: boolean
}

export type ServerMetricsResult = MetricsRangeResult

export function useServerMetrics({
  serverName,
  range,
  refreshMs,
  enabled,
}: UseServerMetricsOptions): ServerMetricsResult {
  const scope = useMemo<MetricsScope | null>(
    () =>
      enabled && serverName !== ''
        ? { kind: 'server', server: serverName }
        : null,
    [enabled, serverName],
  )

  return useMetricsRange({ scope, range, refreshMs, enabled })
}
