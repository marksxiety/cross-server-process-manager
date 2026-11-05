import { useCallback, useEffect, useState } from 'react'
import {
  hasServerSeries,
  isAbortError,
  PrometheusError,
} from '@/api/services/prometheus.service'

export type ServerSeriesAvailability =
  | 'idle'
  | 'loading'
  | 'available'
  | 'empty'
  | 'error'

export type UseServerSeriesAvailabilityOptions = {
  serverName: string
  enabled: boolean
  /** Re-check when this changes, e.g. after a successful metrics refresh. */
  refreshKey?: number | null
}

export interface ServerSeriesAvailabilityResult {
  status: ServerSeriesAvailability
  error: PrometheusError | null
  refresh: () => void
}

export function useServerSeriesAvailability({
  serverName,
  enabled,
  refreshKey = null,
}: UseServerSeriesAvailabilityOptions): ServerSeriesAvailabilityResult {
  const [status, setStatus] = useState<ServerSeriesAvailability>('idle')
  const [error, setError] = useState<PrometheusError | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    if (!enabled || serverName.trim() === '') return

    const controller = new AbortController()
    let active = true

    const load = async () => {
      setStatus('loading')
      setError(null)

      try {
        const available = await hasServerSeries(
          serverName,
          controller.signal,
        )
        if (!active) return
        setStatus(available ? 'available' : 'empty')
      } catch (cause) {
        if (!active || controller.signal.aborted || isAbortError(cause)) {
          return
        }

        setError(
          cause instanceof PrometheusError
            ? cause
            : new PrometheusError(
                cause instanceof Error ? cause.message : String(cause),
                'PROMETHEUS_UNREACHABLE',
              ),
        )
        setStatus('error')
      }
    }

    void load()

    return () => {
      active = false
      controller.abort()
    }
  }, [enabled, serverName, refreshKey, refreshToken])

  const refresh = useCallback(() => {
    setRefreshToken((value) => value + 1)
  }, [])

  const isDisabled = !enabled || serverName.trim() === ''

  return {
    status: isDisabled ? 'idle' : status,
    error: isDisabled ? null : error,
    refresh,
  }
}
