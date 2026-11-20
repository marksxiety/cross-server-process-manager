import { TimeRangePicker } from '@/components/custom/time-range-picker'
import { useMetricsStore } from '@/stores/metrics.store'
import type { MetricsRange } from '@/types/prometheus'

type TimeRangeControlProps = {
  value: MetricsRange
  onChange: (range: MetricsRange) => void
  disabled?: boolean
  loading?: boolean
}

export function TimeRangeControl({
  value,
  onChange,
  disabled = false,
  loading = false,
}: TimeRangeControlProps) {
  const recentAbsoluteRanges = useMetricsStore(
    (state) => state.recentAbsoluteRanges,
  )

  return (
    <TimeRangePicker
      value={value}
      onChange={onChange}
      recentAbsoluteRanges={recentAbsoluteRanges}
      disabled={disabled}
      loading={loading}
    />
  )
}
