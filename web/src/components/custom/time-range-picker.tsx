import { useEffect, useState } from 'react'
import { CalendarClock, Check, ChevronDown, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { formatUptime } from '@/lib/format'
import { METRICS_RANGE_PRESETS } from '@/lib/prometheus'
import {
  formatRangeLabel,
  parseLocalDateTimeInput,
  toLocalDateTimeInput,
  validateCustomRange,
} from '@/lib/time-range'
import { cn } from '@/lib/utils'
import type { MetricsRange } from '@/types/prometheus'

type TimeRangePickerProps = {
  value: MetricsRange
  onChange: (range: MetricsRange) => void
  disabled?: boolean
  loading?: boolean
}

export function TimeRangePicker({
  value,
  onChange,
  disabled = false,
  loading = false,
}: TimeRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [dialogNow, setDialogNow] = useState(() => Date.now())

  useEffect(() => {
    if (!open) return

    const intervalId = window.setInterval(
      () => setDialogNow(Date.now()),
      30_000,
    )

    return () => window.clearInterval(intervalId)
  }, [open])

  const rangeLabel = formatRangeLabel(value)
  const isBusy = disabled || loading
  const fromValue = parseLocalDateTimeInput(from)
  const toValue = parseLocalDateTimeInput(to)
  const validationError = validateCustomRange(fromValue, toValue, dialogNow)
  const durationMs =
    fromValue !== null && toValue !== null && toValue > fromValue
      ? toValue - fromValue
      : null
  const canApply =
    validationError === null && fromValue !== null && toValue !== null

  const seedDraft = () => {
    const currentNow = Date.now()
    const end = value.kind === 'absolute' ? value.end : currentNow
    const start =
      value.kind === 'absolute' ? value.start : end - value.durationMs

    setDialogNow(currentNow)
    setFrom(toLocalDateTimeInput(start))
    setTo(toLocalDateTimeInput(end))
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      if (isBusy) return
      seedDraft()
    }

    setOpen(nextOpen)
  }

  const applyCustomRange = () => {
    if (!canApply || fromValue === null || toValue === null) return

    onChange({ kind: 'absolute', start: fromValue, end: toValue })
    setOpen(false)
  }

  const setEndToNow = () => {
    const currentNow = Date.now()
    setDialogNow(currentNow)
    setTo(toLocalDateTimeInput(currentNow))
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={handleOpenChange}
      disabled={disabled}
    >
      <DropdownMenuTrigger
        render={
          <button
            type='button'
            title={rangeLabel}
            aria-label={`Time range: ${rangeLabel}`}
            aria-busy={loading || undefined}
            disabled={isBusy}
            className={cn(
              'flex h-8 w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2 text-left text-[11px] font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 sm:w-auto lg:h-6',
              open && 'bg-accent text-accent-foreground',
            )}
          />
        }
      >
        {loading ? (
          <LoaderCircle
            className='size-3.5 shrink-0 animate-spin text-muted-foreground'
            strokeWidth={2}
          />
        ) : (
          <CalendarClock
            className='size-3.5 shrink-0 text-muted-foreground'
            strokeWidth={2}
          />
        )}
        <span className='min-w-0 flex-1 truncate'>{rangeLabel}</span>
        <ChevronDown
          className='size-3.5 shrink-0 text-muted-foreground'
          strokeWidth={2}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align='start'
        sideOffset={6}
        aria-label='Time range'
        className='w-[min(36rem,calc(100vw-1rem))] p-0'
      >
        <div className='border-b px-3 py-2'>
          <p className='text-xs font-medium'>Time range</p>
          <p className='text-[11px] text-muted-foreground'>
            Dates and times are local.
          </p>
        </div>

        <div className='grid sm:grid-cols-[minmax(0,1fr)_11rem]'>
          <div
            className='space-y-3 border-b p-3 sm:border-r sm:border-b-0'
            onKeyDown={(event) => {
              if (event.key !== 'Escape') event.stopPropagation()
            }}
          >
            <div className='grid gap-1'>
              <label
                htmlFor='time-range-from'
                className='text-[11px] text-muted-foreground'
              >
                From
              </label>
              <Input
                id='time-range-from'
                type='datetime-local'
                size='xs'
                step={60}
                value={from}
                max={toLocalDateTimeInput(dialogNow)}
                disabled={isBusy}
                aria-invalid={validationError !== null || undefined}
                onChange={(event) => {
                  setDialogNow(Date.now())
                  setFrom(event.target.value)
                }}
              />
            </div>

            <div className='grid gap-1'>
              <div className='flex items-center justify-between gap-2'>
                <label
                  htmlFor='time-range-to'
                  className='text-[11px] text-muted-foreground'
                >
                  To
                </label>
                <Button
                  type='button'
                  variant='ghost'
                  size='xs'
                  disabled={isBusy}
                  onClick={setEndToNow}
                  className='h-5 px-1 text-[10px] text-muted-foreground'
                >
                  Now
                </Button>
              </div>
              <Input
                id='time-range-to'
                type='datetime-local'
                size='xs'
                step={60}
                value={to}
                max={toLocalDateTimeInput(dialogNow)}
                disabled={isBusy}
                aria-invalid={validationError !== null || undefined}
                onChange={(event) => {
                  setDialogNow(Date.now())
                  setTo(event.target.value)
                }}
              />
            </div>

            <div className='min-h-4'>
              {validationError ? (
                <p className='text-[11px] text-destructive'>
                  {validationError}
                </p>
              ) : (
                <p className='text-[11px] text-muted-foreground'>
                  Duration:{' '}
                  <span className='font-medium text-foreground/80'>
                    {durationMs === null ? '—' : formatUptime(durationMs)}
                  </span>
                </p>
              )}
            </div>

            <div className='flex items-center justify-end gap-1.5'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                disabled={disabled}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type='button'
                size='sm'
                disabled={!canApply || isBusy}
                onClick={applyCustomRange}
              >
                Apply
              </Button>
            </div>
          </div>

          <div className='p-2'>
            <p className='px-2 pt-1 pb-2 text-[11px] text-muted-foreground'>
              Relative
            </p>
            {METRICS_RANGE_PRESETS.map((entry) => {
              const isActive =
                value.kind === 'relative' &&
                value.durationMs === entry.durationMs

              return (
                <DropdownMenuItem
                  key={entry.value}
                  aria-label={`${entry.label}${isActive ? ' (selected)' : ''}`}
                  className={cn(
                    'justify-between',
                    isActive && 'bg-accent text-accent-foreground',
                  )}
                  onClick={() => {
                    onChange({
                      kind: 'relative',
                      durationMs: entry.durationMs,
                    })
                    setOpen(false)
                  }}
                >
                  <span className='min-w-0 truncate'>{entry.label}</span>
                  {isActive && (
                    <Check
                      className='ml-auto size-3.5 shrink-0'
                      strokeWidth={2}
                    />
                  )}
                </DropdownMenuItem>
              )
            })}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
