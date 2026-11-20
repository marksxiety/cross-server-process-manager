import { ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { zoomOutMetricsRange } from '@/lib/time-range'
import type { MetricsRange } from '@/types/prometheus'

type ZoomOutButtonProps = {
  value: MetricsRange
  onChange: (range: MetricsRange) => void
  disabled?: boolean
  loading?: boolean
}

export function ZoomOutButton({
  value,
  onChange,
  disabled = false,
  loading = false,
}: ZoomOutButtonProps) {
  return (
    <Button
      type='button'
      variant='outline'
      size='icon-sm'
      disabled={disabled || loading}
      aria-label='Zoom out time range'
      title='Zoom out time range'
      onClick={() => onChange(zoomOutMetricsRange(value))}
      className='size-9 shrink-0 lg:size-6'
    >
      <ZoomOut strokeWidth={2} />
    </Button>
  )
}
