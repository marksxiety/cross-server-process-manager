import { useMemo } from 'react'
import {
  useMetricsRange,
  type MetricsRangeResult,
} from '@/hooks/use-metrics-range'
import type { MetricsRange, MetricsScope } from '@/types/prometheus'
import type { ProcessSummary } from '@/types/process'
import type { RegisteredServer } from '@/types/server'

type UseProcessMetricsOptions = {
  server: RegisteredServer
  process: Pick<ProcessSummary, 'name' | 'namespace'>
  range: MetricsRange
  refreshMs: number
  enabled: boolean
}

export type ProcessMetricsResult = MetricsRangeResult

export function useProcessMetrics({
  server,
  process,
  range,
  refreshMs,
  enabled,
}: UseProcessMetricsOptions): ProcessMetricsResult {
  const scope = useMemo<MetricsScope | null>(
    () =>
      enabled
        ? {
            kind: 'process',
            server: server.server,
            name: process.name,
            namespace: process.namespace,
          }
        : null,
    [enabled, server.server, process.name, process.namespace],
  )

  return useMetricsRange({ scope, range, refreshMs, enabled })
}
