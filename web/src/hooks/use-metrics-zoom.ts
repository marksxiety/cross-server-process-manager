import { useCallback, useEffect, useRef } from 'react'
import { clampTimeRange } from '@/lib/chart-brush'
import { DEFAULT_METRICS_RANGE } from '@/lib/prometheus'
import { useMetricsStore } from '@/stores/metrics.store'
import type { MetricsRange } from '@/types/prometheus'

export type MetricsZoom = {
  selectTimeRange: (start: number, end: number) => void
  resetTimeRange: () => void
}

export function useMetricsZoom(): MetricsZoom {
  const range = useMetricsStore((state) => state.range)
  const setRange = useMetricsStore((state) => state.setRange)
  const lastRelativeRange = useRef<MetricsRange>(DEFAULT_METRICS_RANGE)

  useEffect(() => {
    if (range.kind === 'relative') {
      lastRelativeRange.current = range
    }
  }, [range])

  const selectTimeRange = useCallback(
    (start: number, end: number) => {
      const selection = clampTimeRange(start, end)
      if (selection === null) return

      setRange({
        kind: 'absolute',
        start: selection.start,
        end: selection.end,
      })
    },
    [setRange],
  )

  const resetTimeRange = useCallback(() => {
    setRange(lastRelativeRange.current)
  }, [setRange])

  return { selectTimeRange, resetTimeRange }
}
