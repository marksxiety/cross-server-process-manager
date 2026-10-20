import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { formatUptime } from '@/lib/format'
import {
  METRICS_RANGE_PRESETS,
  PROMETHEUS_RETENTION_MS,
} from '@/lib/prometheus'
import { cn } from '@/lib/utils'
import type { MetricsRange } from '@/types/prometheus'

type TimeRangePickerProps = {
  value: MetricsRange
  onChange: (range: MetricsRange) => void
}

const QUICK_CUSTOM_DURATIONS = METRICS_RANGE_PRESETS.filter((entry) =>
  ['15m', '1h', '6h', '24h'].includes(entry.value),
)

function toLocalInputValue(timestamp: number): string {
  const offset = new Date(timestamp).getTimezoneOffset() * 60_000
  return new Date(timestamp - offset).toISOString().slice(0, 16)
}

function fromLocalInputValue(value: string): number | null {
  if (value === '') return null
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function absoluteRangeLabel(range: MetricsRange): string {
  if (range.kind !== 'absolute') return 'Custom range'
  return `${formatDateTime(range.start)} – ${formatDateTime(range.end)}`
}

export function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
  const [customOpen, setCustomOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [dialogNow, setDialogNow] = useState(0)

  const isCustom = value.kind === 'absolute'
  const customLabel = absoluteRangeLabel(value)

  const openCustom = () => {
    const currentNow = Date.now()
    const end = value.kind === 'absolute' ? value.end : currentNow
    const start =
      value.kind === 'absolute' ? value.start : end - value.durationMs

    setDialogNow(currentNow)
    setFrom(toLocalInputValue(start))
    setTo(toLocalInputValue(end))
    setCustomOpen(true)
  }

  const fromValue = fromLocalInputValue(from)
  const toValue = fromLocalInputValue(to)
  const now = dialogNow
  const durationMs =
    fromValue !== null && toValue !== null && toValue > fromValue
      ? toValue - fromValue
      : null

  let validationError: string | null = null
  if (fromValue === null || toValue === null) {
    validationError = 'Enter both a start and an end.'
  } else if (fromValue >= toValue) {
    validationError = 'The start must be before the end.'
  } else if (toValue - fromValue < 60_000) {
    validationError = 'Choose a range of at least one minute.'
  } else if (fromValue < now - PROMETHEUS_RETENTION_MS) {
    validationError = 'Prometheus only retains 15 days of history.'
  } else if (toValue > now) {
    validationError = 'The end cannot be in the future.'
  }

  const applyCustomRange = () => {
    if (validationError !== null || fromValue === null || toValue === null) {
      return
    }

    onChange({ kind: 'absolute', start: fromValue, end: toValue })
    setCustomOpen(false)
  }

  return (
    <>
      <div
        role='group'
        aria-label='Time range'
        className='flex min-w-fit flex-1 items-center gap-0.5 overflow-x-auto rounded-md bg-muted/60 p-0.5'
      >
        {METRICS_RANGE_PRESETS.map((entry) => {
          const isActive =
            value.kind === 'relative' && value.durationMs === entry.durationMs

          return (
            <Button
              key={entry.value}
              type='button'
              variant='ghost'
              size='sm'
              aria-pressed={isActive}
              aria-label={entry.label}
              onClick={() =>
                onChange({
                  kind: 'relative',
                  durationMs: entry.durationMs,
                })
              }
              className={cn(
                'h-8 min-w-8 shrink-0 px-1.5 text-[11px] font-medium lg:h-6',
                isActive
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border hover:bg-background'
                  : 'text-muted-foreground',
              )}
            >
              {entry.shortLabel}
            </Button>
          )
        })}

        <Button
          type='button'
          variant='ghost'
          size='sm'
          aria-pressed={isCustom}
          aria-label={isCustom ? customLabel : 'Choose a custom time range'}
          title={customLabel}
          onClick={openCustom}
          className={cn(
            'h-8 shrink-0 gap-1 px-2 text-[11px] font-medium lg:h-6',
            isCustom
              ? 'bg-background text-foreground shadow-sm ring-1 ring-border hover:bg-background'
              : 'text-muted-foreground',
          )}
        >
          <Calendar strokeWidth={2} />
          Custom
        </Button>
      </div>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Custom time range</DialogTitle>
            <DialogDescription>
              Times are local. Prometheus retains 15 days of metric history.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-3 sm:grid-cols-2'>
            <label className='grid gap-1.5 text-xs'>
              <span className='text-muted-foreground'>From</span>
              <Input
                type='datetime-local'
                size='xs'
                step={60}
                value={from}
                min={toLocalInputValue(now - PROMETHEUS_RETENTION_MS)}
                max={toLocalInputValue(now)}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label className='grid gap-1.5 text-xs'>
              <span className='flex items-center justify-between text-muted-foreground'>
                To
                <button
                  type='button'
                  className='text-[10px] font-medium text-foreground/70 underline-offset-2 hover:text-foreground hover:underline'
                  onClick={() => {
                    const currentNow = Date.now()
                    setDialogNow(currentNow)
                    setTo(toLocalInputValue(currentNow))
                  }}
                >
                  Now
                </button>
              </span>
              <Input
                type='datetime-local'
                size='xs'
                step={60}
                value={to}
                min={toLocalInputValue(now - PROMETHEUS_RETENTION_MS)}
                max={toLocalInputValue(now)}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
          </div>

          <div className='space-y-2'>
            <div className='flex flex-wrap items-center gap-1.5'>
              <span className='text-[11px] text-muted-foreground'>Quick</span>
              {QUICK_CUSTOM_DURATIONS.map((entry) => (
                <Button
                  key={entry.value}
                  type='button'
                  variant='outline'
                  size='xs'
                  onClick={() => {
                    const currentNow = Date.now()
                    setDialogNow(currentNow)
                    setTo(toLocalInputValue(currentNow))
                    setFrom(
                      toLocalInputValue(currentNow - entry.durationMs),
                    )
                  }}
                >
                  {entry.shortLabel}
                </Button>
              ))}
            </div>

            <p className='text-[11px] text-muted-foreground'>
              Duration:{' '}
              <span className='font-medium text-foreground/80'>
                {durationMs === null ? '—' : formatUptime(durationMs)}
              </span>
            </p>

            {validationError && (
              <p className='text-xs text-destructive'>{validationError}</p>
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant='outline' />}>
              Cancel
            </DialogClose>
            <Button
              type='button'
              disabled={validationError !== null}
              onClick={applyCustomRange}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
