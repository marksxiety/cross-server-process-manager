import { useCallback, useEffect, useRef, useState } from 'react'
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
  MetricsScope,
  ProcessMetricName,
  PrometheusSeries,
  ResolvedMetricsRange,
} from '@/types/prometheus'

type UseMetricsRangeOptions = {
  scope: MetricsScope | null
  range: MetricsRange
  refreshMs: number
  enabled: boolean
}

export interface MetricsRangeResult {
  data: MetricsData;
  status: Record<ProcessMetricName, LoadStatus>;
  errors: Partial<Record<ProcessMetricName, PrometheusError>>;
  isRefreshing: boolean;
  range: ResolvedMetricsRange | null;
  lastUpdated: number | null;
  /**
   * True once a load for the current scope has settled. Later refreshes keep
   * it true so the page stays mounted and each chart shows its own loading
   * state instead of the page-level loader.
   */
  hasLoaded: boolean;
  refresh: () => void;
}

function statusMap(status: LoadStatus): Record<ProcessMetricName, LoadStatus> {
  return Object.fromEntries(
    PROCESS_METRICS.map((metric) => [metric, status]),
  ) as Record<ProcessMetricName, LoadStatus>
}

function hasSeriesData(series: PrometheusSeries[] | undefined): boolean {
  return series?.some((entry) => entry.points.length > 0) ?? false
}

export function useMetricsRange({
  scope,
  range,
  refreshMs,
  enabled,
}: UseMetricsRangeOptions): MetricsRangeResult {
  const [data, setData] = useState<MetricsData>({})
  const [status, setStatus] = useState<Record<ProcessMetricName, LoadStatus>>(
    () => statusMap('idle'),
  )
  const [errors, setErrors] = useState<
    Partial<Record<ProcessMetricName, PrometheusError>>
  >({})
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [resolvedRange, setResolvedRange] = useState<ResolvedMetricsRange | null>(
    null,
  )
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const dataRef = useRef<MetricsData>({})
  const scopeRef = useRef<string | null>(null)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  const relativeDuration = range.kind === 'relative' ? range.durationMs : null
  const absoluteStart = range.kind === 'absolute' ? range.start : null
  const absoluteEnd = range.kind === 'absolute' ? range.end : null

  useEffect(() => {
    if (!enabled || scope === null) return

    const controller = new AbortController()
    const currentRange: MetricsRange =
      relativeDuration !== null
        ? { kind: 'relative', durationMs: relativeDuration }
        : { kind: 'absolute', start: absoluteStart ?? 0, end: absoluteEnd ?? 0 }
    const nextRange = resolveMetricsRange(currentRange)
    const currentScope = scope
    const scopeKey = JSON.stringify(scope)
    const scopeChanged = scopeRef.current !== scopeKey
    const previousData = dataRef.current
    scopeRef.current = scopeKey

    let active = true
    let remaining = PROCESS_METRICS.length
    let successCount = 0

    const finishMetric = () => {
      remaining -= 1
      if (remaining > 0 || !active) return

      setIsRefreshing(false)
      setResolvedRange(nextRange)
      setHasLoaded(true)
      if (successCount > 0) setLastUpdated(Date.now())
    }

    const metricHadData = (metric: ProcessMetricName) =>
      !scopeChanged && hasSeriesData(previousData[metric])

    const load = async () => {
      setErrors({})
      setStatus((current) => {
        const next = { ...current }
        for (const metric of PROCESS_METRICS) {
          next[metric] = metricHadData(metric) ? 'success' : 'loading'
        }
        return next
      })
      setIsRefreshing(true)

      if (scopeChanged) {
        setData({})
        setHasLoaded(false)
      }

      for (const metric of PROCESS_METRICS) {
        void queryRange(metric, currentScope, nextRange, controller.signal)
          .then((series) => {
            if (!active) return

            successCount += 1
            setData((current) => ({ ...current, [metric]: series }))
            setStatus((current) => ({ ...current, [metric]: 'success' }))
            setErrors((current) => {
              if (!current[metric]) return current
              const next = { ...current }
              delete next[metric]
              return next
            })
          })
          .catch((cause) => {
            if (!active || controller.signal.aborted || isAbortError(cause)) {
              return
            }

            const nextError =
              cause instanceof PrometheusError
                ? cause
                : new PrometheusError(
                    cause instanceof Error ? cause.message : String(cause),
                    'PROMETHEUS_UNREACHABLE',
                  )

            setErrors((current) => ({ ...current, [metric]: nextError }))
            setStatus((current) => ({
              ...current,
              [metric]: metricHadData(metric) ? 'success' : 'error',
            }))
          })
          .finally(finishMetric)
      }
    }

    void load()

    return () => {
      active = false
      controller.abort()
    }
  }, [
    enabled,
    scope,
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
    data,
    status,
    errors,
    isRefreshing,
    range: resolvedRange,
    lastUpdated,
    hasLoaded,
    refresh,
  }
}
