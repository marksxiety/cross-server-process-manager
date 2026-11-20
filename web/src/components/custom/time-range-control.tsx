import { ZoomOut } from 'lucide-react'
import { TimeRangePicker } from '@/components/custom/time-range-picker'
import { Button } from '@/components/ui/button'
import { zoomOutMetricsRange } from '@/lib/time-range'
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
  const isBusy = disabled || loading
  const recentAbsoluteRanges = useMetricsStore(
    (state) => state.recentAbsoluteRanges,
  )

  return (
    <div className='flex min-w-0 items-center gap-1.5'>
      <div className='min-w-0 flex-1 sm:flex-none'>
        <TimeRangePicker
          value={value}
          onChange={onChange}
          recentAbsoluteRanges={recentAbsoluteRanges}
          disabled={disabled}
          loading={loading}
        />
      </div>
      <Button
        type='button'
        variant='outline'
        size='icon-sm'
        disabled={isBusy}
        aria-label='Zoom out time range'
        title='Zoom out time range'
        onClick={() => onChange(zoomOutMetricsRange(value))}
        className='size-8 shrink-0 lg:size-6'
      >
        <ZoomOut strokeWidth={2} />
      </Button>
    </div>
  )
}
