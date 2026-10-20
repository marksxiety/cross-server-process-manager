import { useEffect, useState } from 'react'
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
import { formatRelativeTime } from '@/lib/format'
import { METRICS_REFRESH_OPTIONS } from '@/lib/prometheus'
import { cn } from '@/lib/utils'
import type { MetricsRange } from '@/types/prometheus'

type MetricsToolbarProps = {
  range: MetricsRange
  refreshMs: number
  lastUpdated: number | null
  isRefreshing: boolean
  hasError: boolean
  onRangeChange: (range: MetricsRange) => void
  onRefreshMsChange: (refreshMs: number) => void
  onRefresh: () => void
}

type StatusTone = 'live' | 'paused' | 'updating' | 'error' | 'idle'

type Status = {
  tone: StatusTone
  label: string
  detail: string | null
}

const STATUS_TONE_STYLES: Record<
  StatusTone,
  { dot: string; label: string; pulse: boolean }
> = {
  live: {
    dot: 'bg-emerald-500',
    label: 'text-foreground/80',
    pulse: true,
  },
  paused: {
    dot: 'bg-muted-foreground/50',
    label: 'text-muted-foreground',
    pulse: false,
  },
  updating: {
    dot: 'bg-sky-500',
    label: 'text-foreground/80',
    pulse: true,
  },
  error: {
    dot: 'bg-amber-500',
    label: 'text-amber-600 dark:text-amber-400',
    pulse: false,
  },
  idle: {
    dot: 'bg-muted-foreground/40',
    label: 'text-muted-foreground',
    pulse: false,
  },
}

function describeStatus({
  hasError,
  isRefreshing,
  lastUpdated,
  refreshMs,
  now,
}: {
  hasError: boolean
  isRefreshing: boolean
  lastUpdated: number | null
  refreshMs: number
  now: number
}): Status {
  const updatedDetail =
    lastUpdated === null
      ? null
      : `Updated ${formatRelativeTime(lastUpdated, now)}`

  if (isRefreshing) {
    return {
      tone: 'updating',
      label: lastUpdated === null ? 'Loading' : 'Updating',
      detail: lastUpdated === null ? 'Fetching metrics' : updatedDetail,
    }
  }

  if (hasError) {
    return lastUpdated === null
      ? { tone: 'error', label: 'Unavailable', detail: 'No successful fetch' }
      : {
          tone: 'error',
          label: 'Stale',
          detail: `Last success ${formatRelativeTime(lastUpdated, now)}`,
        }
  }

  if (lastUpdated === null) {
    return { tone: 'idle', label: 'Not loaded yet', detail: null }
  }

  if (refreshMs <= 0) {
    return { tone: 'paused', label: 'Paused', detail: updatedDetail }
  }

  return { tone: 'live', label: 'Live', detail: updatedDetail }
}

export function MetricsToolbar({
  range,
  refreshMs,
  lastUpdated,
  isRefreshing,
  hasError,
  onRangeChange,
  onRefreshMsChange,
  onRefresh,
}: MetricsToolbarProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (lastUpdated === null) return

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [lastUpdated])

  const status = describeStatus({
    hasError,
    isRefreshing,
    lastUpdated,
    refreshMs,
    now,
  })
  const tone = STATUS_TONE_STYLES[status.tone]
  const exactUpdated =
    lastUpdated === null
      ? undefined
      : `Last updated ${new Date(lastUpdated).toLocaleString()}`

  return (
    <section
      aria-label='Metrics controls'
      className='shrink-0 pb-3'
    >
      <div className='space-y-2 rounded-lg bg-muted/30 p-2.5 ring-1 ring-border/60'>
        <TimeRangePicker value={range} onChange={onRangeChange} />

        <div className='flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/60 pt-2'>
          <div
            className='flex min-w-0 flex-1 items-center gap-1.5 text-[11px]'
            title={exactUpdated}
          >
            <span
              aria-hidden
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                tone.dot,
                tone.pulse && 'animate-pulse',
              )}
            />
            <span className={cn('font-medium', tone.label)}>
              {status.label}
            </span>
            {status.detail && (
              <>
                <span aria-hidden className='text-muted-foreground/50'>
                  ·
                </span>
                <span className='truncate text-muted-foreground'>
                  {status.detail}
                </span>
              </>
            )}
          </div>

          <div className='ml-auto flex shrink-0 items-center gap-1.5'>
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
          </div>
        </div>
      </div>
    </section>
  )
}
