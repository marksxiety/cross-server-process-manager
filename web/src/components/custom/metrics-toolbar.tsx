import { RefreshCw, Timer } from 'lucide-react'
import { TimeRangePicker } from '@/components/custom/time-range-picker'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { METRICS_REFRESH_OPTIONS } from '@/lib/prometheus'
import { cn } from '@/lib/utils'
import type { MetricsRange } from '@/types/prometheus'

type MetricsToolbarProps = {
  range: MetricsRange
  refreshMs: number
  isRefreshing: boolean
  onRangeChange: (range: MetricsRange) => void
  onRefreshMsChange: (refreshMs: number) => void
  onRefresh: () => void
}

export function MetricsToolbar({
  range,
  refreshMs,
  isRefreshing,
  onRangeChange,
  onRefreshMsChange,
  onRefresh,
}: MetricsToolbarProps) {
  return (
    <section
      aria-label='Metrics controls'
      className='shrink-0 rounded-lg bg-muted/30 p-2.5 ring-1 ring-border/60'
    >
      <div className='flex flex-wrap items-center gap-2'>
        <TimeRangePicker value={range} onChange={onRangeChange} />

        <div className='ml-auto flex shrink-0 items-center gap-1.5'>
          <Select
            items={METRICS_REFRESH_OPTIONS}
            value={String(refreshMs)}
            onValueChange={(value) => onRefreshMsChange(Number(value))}
          >
            <SelectTrigger
              size='sm'
              className='w-24'
              aria-label='Auto-refresh interval'
            >
              <Timer strokeWidth={2} className='text-muted-foreground' />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRICS_REFRESH_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={isRefreshing}
            aria-label='Refresh metrics'
            onClick={onRefresh}
            className='h-8 gap-1.5 px-2 text-[11px] lg:h-6'
          >
            <RefreshCw
              strokeWidth={2}
              className={cn(isRefreshing && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>
      </div>
    </section>
  )
}
