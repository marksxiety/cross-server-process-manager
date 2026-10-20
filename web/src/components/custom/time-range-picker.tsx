import { useState } from 'react'
import { ChevronDown, Clock } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  findRangePreset,
  METRICS_RANGE_PRESETS,
  PROMETHEUS_RETENTION_MS,
} from '@/lib/prometheus'
import type { MetricsRange } from '@/types/prometheus'

type TimeRangePickerProps = {
  value: MetricsRange
  onChange: (range: MetricsRange) => void
}

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

function rangeLabel(range: MetricsRange): string {
  if (range.kind === 'relative') {
    return findRangePreset(range.durationMs)?.label ?? 'Relative range'
  }

  return `${formatDateTime(range.start)} – ${formatDateTime(range.end)}`
}

export function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
  const [customOpen, setCustomOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [dialogNow, setDialogNow] = useState(0)

  const preset =
    value.kind === 'relative' ? findRangePreset(value.durationMs) : undefined

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
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant='outline'
              size='sm'
              className='max-w-full justify-between gap-2'
              aria-label={`Time range: ${rangeLabel(value)}`}
            />
          }
        >
          <Clock strokeWidth={2} />
          <span className='min-w-0 truncate'>{rangeLabel(value)}</span>
          <ChevronDown strokeWidth={2} className='text-muted-foreground' />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-56'>
          <DropdownMenuRadioGroup
            value={preset?.value}
            onValueChange={(next) => {
              if (typeof next !== 'string') return
              const match = METRICS_RANGE_PRESETS.find(
                (entry) => entry.value === next,
              )
              if (match) {
                onChange({ kind: 'relative', durationMs: match.durationMs })
              }
            }}
          >
            {METRICS_RANGE_PRESETS.map((entry) => (
              <DropdownMenuRadioItem key={entry.value} value={entry.value}>
                {entry.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openCustom}>
            <Clock strokeWidth={2} />
            Custom range…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom time range</DialogTitle>
            <DialogDescription>
              Prometheus retains 15 days of metric history.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-3'>
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
              <span className='text-muted-foreground'>To</span>
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
