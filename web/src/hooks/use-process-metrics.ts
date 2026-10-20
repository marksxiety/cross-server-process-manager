import { useCallback, useEffect, useState } from 'react'
import {
  isAbortError,
  PrometheusError,
  queryRange,
} from '@/api/services/prometheus.service'
import { PROCESS_METRICS, resolveMetricsRange } from '@/lib/prometheus'
import type { LoadStatus } from '@/types/dashboard'
import type {
  MetricsData,
  MetricsRange,
  PrometheusTarget,
  ResolvedMetricsRange,
} from '@/types/prometheus'
import type { ProcessSummary } from '@/types/process'
import type { RegisteredServer } from '@/types/server'

type UseProcessMetricsOptions = {
  server: RegisteredServer
  process: Pick<ProcessSummary, 'name' | 'namespace'>
  range: MetricsRange
  refreshMs: number
  enabled: boolean
}

export interface ProcessMetricsResult {
  status: LoadStatus
  isRefreshing: boolean
  error: PrometheusError | null
  data: MetricsData
  range: ResolvedMetricsRange | null
  lastUpdated: number | null
  refresh: () => void
}

export function useProcessMetrics({
  server,
  process,
  range,
  refreshMs,
  enabled,
}: UseProcessMetricsOptions): ProcessMetricsResult {
  const [status, setStatus] = useState<LoadStatus>('idle')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<PrometheusError | null>(null)
  const [data, setData] = useState<MetricsData>({})
  const [resolvedRange, setResolvedRange] = useState<ResolvedMetricsRange | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  const serverName = server.server
  const processName = process.name
  const processNamespace = process.namespace
  const relativeDuration = range.kind === 'relative' ? range.durationMs : null
  const absoluteStart = range.kind === 'absolute' ? range.start : null
  const absoluteEnd = range.kind === 'absolute' ? range.end : null

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()
    const currentRange: MetricsRange =
      relativeDuration !== null
        ? { kind: 'relative', durationMs: relativeDuration }
        : { kind: 'absolute', start: absoluteStart ?? 0, end: absoluteEnd ?? 0 }
    const nextRange = resolveMetricsRange(currentRange)
    const target: PrometheusTarget = {
      name: processName,
      namespace: processNamespace,
      server: serverName,
    }

    let active = true

    const load = async () => {
      setIsRefreshing(true)
      setError(null)
      setStatus((current) => (current === 'success' ? 'success' : 'loading'))

      try {
        const entries = await Promise.all(
          PROCESS_METRICS.map(async (metric) => {
            const series = await queryRange(
              metric,
              target,
              nextRange,
              controller.signal,
            )
            return [metric, series] as const
          }),
        )

        if (!active) return

        setData(Object.fromEntries(entries) as MetricsData)
        setResolvedRange(nextRange)
        setLastUpdated(Date.now())
        setStatus('success')
        setIsRefreshing(false)
      } catch (cause) {
        if (!active || controller.signal.aborted || isAbortError(cause)) return

        const nextError =
          cause instanceof PrometheusError
            ? cause
            : new PrometheusError(
                cause instanceof Error ? cause.message : String(cause),
                'PROMETHEUS_UNREACHABLE',
              )

        setError(nextError)
        setStatus((current) => (current === 'success' ? 'success' : 'error'))
        setIsRefreshing(false)
      }
    }

    void load()

    return () => {
      active = false
      controller.abort()
    }
  }, [
    enabled,
    serverName,
    processName,
    processNamespace,
    relativeDuration,
    absoluteStart,
    absoluteEnd,
    refreshToken,
  ])

  useEffect(() => {
    if (!enabled || refreshMs <= 0) return

    const intervalId = window.setInterval(
      () => setRefreshToken((value) => value + 1),
      refreshMs,
    )
    return () => window.clearInterval(intervalId)
  }, [enabled, refreshMs])

  const refresh = useCallback(() => {
    setRefreshToken((value) => value + 1)
  }, [])

  return {
    status,
    isRefreshing,
    error,
    data,
    range: resolvedRange,
    lastUpdated,
    refresh,
  }
}
