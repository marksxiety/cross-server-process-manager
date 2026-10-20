import { lazy, Suspense, useEffect, useState } from 'react'
import { Check, ChevronDown, Eraser, RefreshCw, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import { ErrorAlert } from '@/components/custom/error-alert'
import { processService } from '@/api/services/process.service'
import { errorCodeLabel, toApiError } from '@/lib/error-code'
import { isProcessInactive } from '@/lib/process-status'
import {
  formatBytes,
  formatLogTimestamp,
  formatMetricValue,
  formatPercent,
  formatUptime,
  memorySharePercent,
} from '@/lib/format'
import {
  ADVANCED_GROUPS,
  catalogField,
  isFieldEnabled,
  isValueEmpty,
  isWideField,
  type ProcessFieldSpec,
} from '@/lib/process-fields'
import {
  advancedRegistrationFields,
  basicRegistrationFields,
  type RegistrationField,
} from '@/lib/process-registration'
import { getStatusVisual } from '@/lib/status-styles'
import { percentTone, toneProgressClasses, toneSurfaceClasses } from '@/lib/status-tone'
import { cn } from '@/lib/utils'
import {
  LOGS_DEFAULT_TAIL,
  LOGS_TAIL_OPTIONS,
  useProcessLogsStore,
  type LogsEntry,
} from '@/stores/process-logs.store'
import type { ApiError, ApiResponse } from '@/types/api'
import type { LoadStatus } from '@/types/dashboard'
import type {
  LogClearScope,
  LogClearStream,
  ProcessDescribe,
  ProcessLogsClearResult,
  ProcessSummary,
} from '@/types/process'
import type { RegisteredServer } from '@/types/server'

const ProcessMetricsTab = lazy(() =>
  import('@/components/custom/process-metrics-tab').then((module) => ({
    default: module.ProcessMetricsTab,
  })),
)

type TabValue = 'overview' | 'metrics' | 'config' | 'logs'

const DEFAULT_CONFIG_OPEN = ['identity', 'execution', 'restart']

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** Renders null/undefined/empty-string values as an em dash instead of blank. */
function orDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string' && value.trim() === '') return '—'
  if (typeof value === 'number' && !Number.isFinite(value)) return '—'
  return String(value)
}

function formatDuration(value: unknown): string {
  return typeof value === 'number' ? `${value} ms` : String(value)
}

/** "Needs Auto Restart off" — why a dependent field has no value to show. */
function conditionText(spec: ProcessFieldSpec): string {
  const condition = spec.enabledWhen
  if (!condition) return 'Not applicable'
  const dependency = catalogField(condition.key)?.label ?? condition.key
  const states = condition.oneOf
    .map((state) => (state === true ? 'on' : state === false ? 'off' : String(state)))
    .join(' or ')
  return `Needs ${dependency} ${states}`
}

// ---------------------------------------------------------------------------
// Tone helpers — decide when a value needs to stand out
// ---------------------------------------------------------------------------

type Tone = 'default' | 'warning' | 'danger'

function statToneClasses(tone: Tone): string {
  if (tone === 'danger') return toneSurfaceClasses.danger
  if (tone === 'warning') return toneSurfaceClasses.warning
  return 'bg-muted/50'
}

function statLabelClasses(tone: Tone): string {
  if (tone === 'danger') return 'text-destructive'
  if (tone === 'warning') return 'text-amber-600 dark:text-amber-400'
  return 'text-muted-foreground'
}

// ---------------------------------------------------------------------------
// Small presentational building blocks
// ---------------------------------------------------------------------------

function StatTile({
  label,
  value,
  sub,
  progress,
  tone = 'default',
  disabled = false,
}: {
  label: string
  value: string
  /** Quiet qualifier beside the value, e.g. "0 unstable" or "3.1%". */
  sub?: string
  /** 0–100; draws a thin bar under the value. */
  progress?: number | null
  tone?: Tone
  /** Mutes the value and bar for an inactive process (crashed, stopped…). */
  disabled?: boolean
}) {
  return (
    <div className={cn('rounded-lg p-3', statToneClasses(tone))}>
      <p className={cn('text-xs', statLabelClasses(tone))}>{label}</p>
      <p
        className={cn(
          'mt-0.5 flex items-baseline gap-1.5 text-base font-medium',
          disabled
            ? 'text-muted-foreground'
            : tone !== 'default' && statLabelClasses(tone),
        )}
      >
        {value}
        {sub && <span className='text-xs font-normal opacity-80'>{sub}</span>}
      </p>
      {progress !== null && progress !== undefined && (
        <Progress
          value={Math.min(100, Math.max(0, progress))}
          className={cn(
            'mt-2.5 **:data-[slot=progress-track]:h-1 **:data-[slot=progress-indicator]:min-w-1',
            disabled
              ? toneProgressClasses.neutral
              : toneProgressClasses[percentTone(progress)],
          )}
        />
      )}
    </div>
  )
}

function FlagBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <Badge variant='secondary' className='gap-1 font-normal text-muted-foreground'>
      {active ? (
        <Check
          className={cn('size-3', getStatusVisual('online').text)}
          strokeWidth={2.5}
        />
      ) : (
        <X className='size-3' strokeWidth={2.5} />
      )}
      {label}
    </Badge>
  )
}

function KeyValueRow({
  label,
  value,
}: {
  label: string
  value: string | number | null | undefined
}) {
  return (
    <div className='flex items-center justify-between gap-3 py-0.5 text-sm'>
      <span className='text-muted-foreground'>{label}</span>
      <span className='min-w-0 truncate text-right font-mono text-xs'>{orDash(value)}</span>
    </div>
  )
}

function DefaultBadge() {
  return (
    <Badge
      variant='secondary'
      className='h-4 rounded px-1 text-[10px] leading-none font-normal text-muted-foreground'
    >
      default
    </Badge>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className='mb-2.5 text-xs font-medium text-muted-foreground'>{children}</p>
}

/** A value in a bordered box that wraps instead of truncating. */
function ValueBox({
  children,
  muted,
  dashed,
}: {
  children: React.ReactNode
  muted?: boolean
  dashed?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-md border bg-muted/30 px-2.5 py-1.5 font-mono text-xs leading-relaxed break-all',
        muted && 'text-muted-foreground',
        dashed && 'border-dashed bg-transparent',
      )}
    >
      {children}
    </div>
  )
}

function TagChip({ children }: { children: React.ReactNode }) {
  return (
    <span className='inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-[11px] break-all'>
      {children}
    </span>
  )
}

/** Label above a full-width value — used for paths, where length is the point. */
function StackedField({ label, value }: { label: string; value: string | null | undefined }) {
  const empty = !value || value.trim() === ''
  return (
    <div className='min-w-0'>
      <p className='mb-1 text-xs text-muted-foreground'>{label}</p>
      <ValueBox muted={empty}>{empty ? '—' : value}</ValueBox>
    </div>
  )
}

/** Accordion row: group name on the left, a quiet count on the right. */
function GroupTrigger({ label, count }: { label: string; count?: string | number }) {
  return (
    <AccordionTrigger className='py-3 hover:no-underline'>
      <span className='flex min-w-0 flex-1 items-center justify-between gap-2 pr-2'>
        <span className='text-sm font-medium'>{label}</span>
        {count !== undefined && (
          <span className='text-xs font-normal text-muted-foreground'>{count}</span>
        )}
      </span>
    </AccordionTrigger>
  )
}

const accordionRootClass = 'rounded-none border-0'
const accordionItemClass = 'border-0 border-t first:border-t-0 data-open:bg-transparent'

// ---------------------------------------------------------------------------
// Config — read-only view of the registration, grouped like the form
// ---------------------------------------------------------------------------

const IDENTITY_KEYS = new Set(['name', 'namespace'])

type ConfigGroup = {
  id: string
  label: string
  fields: RegistrationField[]
}

function buildConfigGroups(data: ProcessDescribe): ConfigGroup[] {
  const basic = basicRegistrationFields(data)
  const identity = basic.filter((field) => IDENTITY_KEYS.has(field.spec.key))
  const execution = basic.filter((field) => !IDENTITY_KEYS.has(field.spec.key))
  const advanced = ADVANCED_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    fields: advancedRegistrationFields(group.id, data),
  }))

  return [
    { id: 'identity', label: 'Identity', fields: identity },
    { id: 'execution', label: 'Execution', fields: execution },
    ...advanced,
  ].filter((group) => group.fields.length > 0)
}

function FieldValue({ spec, value }: { spec: ProcessFieldSpec; value: unknown }) {
  if (spec.type === 'boolean') {
    const active = value === undefined ? spec.defaultValue === true : value === true || value === 'true'
    return (
      <TagChip>
        {active ? (
          <Check className={cn('size-3', getStatusVisual('online').text)} strokeWidth={2.5} />
        ) : (
          <X className='size-3 text-muted-foreground' strokeWidth={2.5} />
        )}
        {active ? 'true' : 'false'}
      </TagChip>
    )
  }

  if (isValueEmpty(value)) return <ValueBox muted>Not set</ValueBox>

  if (spec.type === 'array' && Array.isArray(value)) {
    return (
      <div className='flex flex-wrap gap-1.5'>
        {value.map((entry, index) => (
          <TagChip key={`${String(entry)}-${index}`}>{String(entry)}</TagChip>
        ))}
      </div>
    )
  }

  if (spec.type === 'object' && typeof value === 'object' && value !== null) {
    return (
      <div className='overflow-hidden rounded-md border font-mono text-xs'>
        {Object.entries(value as Record<string, unknown>).map(([key, entry]) => (
          <div
            key={key}
            className='grid grid-cols-[38%_1fr] gap-2.5 border-t px-2.5 py-1.5 first:border-t-0'
          >
            <span className='break-all text-muted-foreground'>{key}</span>
            <span className='break-all'>{String(entry ?? '')}</span>
          </div>
        ))}
      </div>
    )
  }

  if (spec.type === 'duration') return <ValueBox>{formatDuration(value)}</ValueBox>

  return <ValueBox>{String(value)}</ValueBox>
}

function ConfigField({
  field,
  enabled,
}: {
  field: RegistrationField
  enabled: boolean
}) {
  const { spec, value, isDefault } = field

  return (
    <div className={cn('min-w-0', isWideField(spec) && 'sm:col-span-2')}>
      <div className='mb-1 flex items-center gap-1.5 text-xs text-muted-foreground'>
        <span>{spec.label}</span>
        {enabled && isDefault && <DefaultBadge />}
      </div>
      {enabled ? (
        <FieldValue spec={spec} value={value} />
      ) : (
        <ValueBox muted dashed>
          {conditionText(spec)}
        </ValueBox>
      )}
    </div>
  )
}

function ConfigTab({
  data,
  open,
  onOpenChange,
}: {
  data: ProcessDescribe
  open: string[]
  onOpenChange: (open: string[]) => void
}) {
  const { describe } = data
  const groups = buildConfigGroups(data)
  // Dependencies resolve against every field's value, like the form does.
  const values = Object.fromEntries(
    groups.flatMap((group) => group.fields).map((field) => [field.spec.key, field.value]),
  )

  return (
    <Accordion value={open} onValueChange={onOpenChange} className={cn(accordionRootClass, 'p-4')}>
      {groups.map((group) => (
        <AccordionItem key={group.id} value={group.id} className={accordionItemClass}>
          <GroupTrigger label={group.label} count={group.fields.length} />
          <AccordionContent className='pb-4'>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              {group.fields.map((field) => (
                <ConfigField
                  key={field.spec.key}
                  field={field}
                  enabled={isFieldEnabled(field.spec, values)}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
      <AccordionItem value='paths' className={accordionItemClass}>
        <GroupTrigger label='Paths' count={describe.entire_log_path ? 4 : 3} />
        <AccordionContent className='space-y-2.5 pb-4'>
          <StackedField label='Out log' value={describe.out_log_path} />
          <StackedField label='Error log' value={describe.error_log_path} />
          <StackedField label='PID file' value={describe.pid_path} />
          {describe.entire_log_path && (
            <StackedField label='Entire log path' value={describe.entire_log_path} />
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

// ---------------------------------------------------------------------------
// Overview — live state, quick to scan
// ---------------------------------------------------------------------------

function OverviewTab({
  data,
  totalMemoryBytes,
}: {
  data: ProcessDescribe
  totalMemoryBytes: number | null
}) {
  const { summary, describe, metrics } = data
  const metricEntries = Object.entries(metrics)
  const memoryShare = memorySharePercent(summary.memory, totalMemoryBytes)
  const cpuKnown = Number.isFinite(summary.cpu)
  const inactive = isProcessInactive(summary)

  return (
    <div className='space-y-5 p-4'>
      <section>
        <div className='mb-2.5 flex flex-wrap items-center justify-between gap-2'>
          <SectionLabel>Live status</SectionLabel>
          <div className='flex flex-wrap gap-1.5'>
            <FlagBadge label='autorestart' active={summary.autorestart ?? false} />
            <FlagBadge label='watch' active={summary.watch} />
          </div>
        </div>
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
          <StatTile label='Uptime' value={formatUptime(summary.uptime)} />
          <StatTile label='Restarts' value={orDash(summary.restarts)} />
          <div className='col-span-2 sm:col-span-1'>
            <StatTile
              label='Unstable restarts'
              value={orDash(summary.unstable_restarts)}
            />
          </div>
        </div>
        <div className='mt-3 grid grid-cols-2 gap-3'>
          <StatTile
            label='CPU'
            value={cpuKnown ? `${summary.cpu}%` : '—'}
            progress={cpuKnown ? summary.cpu : null}
            disabled={inactive}
          />
          <StatTile
            label='Memory'
            value={memoryShare === null ? formatBytes(summary.memory) : formatPercent(memoryShare)}
            sub={memoryShare === null ? undefined : formatBytes(summary.memory)}
            progress={memoryShare}
            disabled={inactive}
          />
        </div>
      </section>

      <section>
        <SectionLabel>Runtime</SectionLabel>
        {describe.node_version !== null && (
          <KeyValueRow label='Node version' value={describe.node_version} />
        )}
        {describe.node_env !== null && <KeyValueRow label='Node env' value={describe.node_env} />}
        {describe.version !== null && <KeyValueRow label='App version' value={describe.version} />}
        <KeyValueRow label='IP address' value={summary.ip_address} />
        <KeyValueRow label='Created' value={describe.created_at} />
      </section>

      {metricEntries.length > 0 && (
        <section>
          <SectionLabel>Custom metrics</SectionLabel>
          <div className='grid grid-cols-1 gap-x-6 sm:grid-cols-2'>
            {metricEntries.map(([key, metric]) => (
              <KeyValueRow key={key} label={key} value={formatMetricValue(metric)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Logs — merged out/error timeline
// ---------------------------------------------------------------------------

type StreamFilter = 'all' | 'error'

const LOG_STREAM_OPTIONS: LogClearStream[] = ['all', 'out', 'err']

const LOG_STREAM_LABELS: Record<LogClearStream, string> = {
  all: 'All logs',
  out: 'Output only',
  err: 'Errors only',
}

const LOG_SCOPE_OPTIONS: { value: LogClearScope; label: string; hint: string }[] = [
  {
    value: 'active',
    label: 'Active',
    hint: 'Truncates the active log file(s) in place; the process keeps writing.',
  },
  {
    value: 'rotated',
    label: 'Rotated',
    hint: 'Permanently deletes rotated archive files (.log.gz, .log.N).',
  },
  {
    value: 'all',
    label: 'Both',
    hint: 'Truncates active files and permanently deletes rotated archives.',
  },
]

type FlushOutcome = {
  result: ApiResponse<ProcessLogsClearResult | null>
  usedFallback: boolean
}

function LogsTab({
  server,
  pmId,
  processName,
  logs,
}: {
  server: RegisteredServer
  pmId: number
  processName: string
  logs: LogsEntry | undefined
}) {
  const [filter, setFilter] = useState<StreamFilter>('all')
  const [pendingStream, setPendingStream] = useState<LogClearStream | null>(null)
  const [scope, setScope] = useState<LogClearScope>('active')
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isFlushing, setIsFlushing] = useState(false)
  const tail = logs?.tail ?? LOGS_DEFAULT_TAIL
  const setTail = useProcessLogsStore((state) => state.setTail)
  const refreshLogs = useProcessLogsStore((state) => state.refresh)

  const lines = logs?.lines ?? []
  const errorCount = lines.filter((line) => line.stream === 'error').length
  const visible = filter === 'error' ? lines.filter((line) => line.stream === 'error') : lines

  const openConfirm = (stream: LogClearStream) => {
    setPendingStream(stream)
    setScope('active')
    setIsConfirmOpen(true)
  }

  // Tries the stream/scope-aware route first and falls back to the legacy
  // both-streams flush only when an older agent lacks the new route.
  const requestFlush = async (
    stream: LogClearStream,
    selectedScope: LogClearScope,
  ): Promise<FlushOutcome> => {
    const service = processService(server)
    const result = await service.clearLogs(pmId, { stream, scope: selectedScope })
    if (result.success) return { result, usedFallback: false }

    const routeMissing = result.status === 404 && result.code === undefined
    if (!routeMissing) return { result, usedFallback: false }

    if (stream === 'all' && selectedScope === 'active') {
      return { result: await service.flushLegacy(pmId), usedFallback: true }
    }

    throw {
      code: 'AGENT_UPDATE_REQUIRED',
      message:
        'This agent does not support per-stream or rotated-log clearing. Update the agent to use this option.',
      status: 404,
    } satisfies ApiError
  }

  const confirmFlush = async () => {
    if (pendingStream === null) return

    const stream = pendingStream
    const selectedScope = scope
    setIsFlushing(true)

    const request = requestFlush(stream, selectedScope).then(({ result, usedFallback }) => {
      if (!result.success) throw toApiError(result)
      return { result, usedFallback }
    })

    try {
      await toast.promise(request, {
        loading: { title: 'Flushing logs…' },
        success: ({ result, usedFallback }) => ({
          title: 'Logs cleared',
          description: result.info
            ? `${formatBytes(result.info.bytesFreed)} freed on ${server.server}.`
            : usedFallback
              ? `Both active streams were flushed on ${server.server}.`
              : `Logs cleared on ${server.server}.`,
        }),
        error: (error: ApiError) => ({
          title: errorCodeLabel(error.code),
          description: error.message,
        }),
      })
      setIsConfirmOpen(false)
      setPendingStream(null)
      await refreshLogs(server, pmId)
    } catch {
      // toast.promise already surfaced the error; keep the dialog open.
    } finally {
      setIsFlushing(false)
    }
  }

  return (
    <div className='my-3 flex h-full min-h-0 flex-col sm:my-4'>
      <div className='mb-2 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='text-xs text-muted-foreground'>Rows</span>
          <Select
            value={String(tail)}
            onValueChange={(value) => void setTail(server, pmId, Number(value))}
          >
            <SelectTrigger size='sm' className='w-20'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOGS_TAIL_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className='flex gap-0.5 rounded-md bg-muted/50 p-0.5'>
            <Button
              type='button'
              size='sm'
              variant={filter === 'all' ? 'secondary' : 'ghost'}
              className='h-9 px-2.5 text-xs lg:h-6'
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              type='button'
              size='sm'
              variant={filter === 'error' ? 'secondary' : 'ghost'}
              className='h-9 px-2.5 text-xs lg:h-6'
              onClick={() => setFilter('error')}
            >
              Errors{errorCount > 0 && ` ${errorCount}`}
            </Button>
          </div>
        </div>
        <div className='flex items-center justify-end gap-2 sm:justify-start'>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  aria-label='Flush logs'
                  title='Flush logs'
                  disabled={isFlushing}
                />
              }
            >
              {isFlushing ? <Spinner className='size-3.5' /> : <Eraser strokeWidth={2} />}
              Flush
              <ChevronDown strokeWidth={2} className='size-3.5' />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-44'>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Flush logs</DropdownMenuLabel>
                {LOG_STREAM_OPTIONS.map((stream) => (
                  <DropdownMenuItem key={stream} onClick={() => openConfirm(stream)}>
                    {LOG_STREAM_LABELS[stream]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            aria-label='Refresh logs'
            title='Refresh logs'
            disabled={logs?.refreshing}
            onClick={() => void refreshLogs(server, pmId)}
          >
            <RefreshCw strokeWidth={2} className={cn(logs?.refreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {!logs || logs.status === 'loading' ? (
        <div className='flex flex-1 items-center justify-center gap-2 text-xs text-muted-foreground'>
          <Spinner className='size-4' />
          Loading logs…
        </div>
      ) : logs.status === 'error' && lines.length === 0 ? (
        logs.requestError ? (
          <div className='flex flex-1 items-center'>
            <ErrorAlert error={logs.requestError} onRetry={() => void refreshLogs(server, pmId)} />
          </div>
        ) : null
      ) : (
        <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border bg-muted/30'>
          {lines.length === 0 ? (
            <p className='flex flex-1 items-center justify-center text-xs text-muted-foreground'>
              No logs
            </p>
          ) : visible.length === 0 ? (
            <p className='flex flex-1 items-center justify-center text-xs text-muted-foreground'>
              No errors in the last {lines.length} lines
            </p>
          ) : (
            <ScrollArea className='min-h-0 flex-1'>
              <div className='p-2'>
                {visible.map((line) => (
                  <div key={line.id} className='flex gap-2 py-0.5 font-mono text-xs'>
                    <span
                      className='shrink-0 tabular-nums text-muted-foreground'
                      title={line.timestamp ?? undefined}
                    >
                      {formatLogTimestamp(line.timestamp)}
                    </span>
                    <span
                      className={cn(
                        'w-6 shrink-0 font-medium',
                        line.stream === 'error' ? 'text-destructive' : 'text-muted-foreground',
                      )}
                    >
                      {line.stream === 'error' ? 'err' : 'out'}
                    </span>
                    <span
                      className={cn(
                        'min-w-0 whitespace-pre-wrap break-all',
                        line.stream === 'error' && 'text-destructive',
                      )}
                    >
                      {line.message}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className='flex shrink-0 items-center gap-2 border-t px-2 py-1 text-xs text-muted-foreground'>
            <span>
              Showing {visible.length} of {lines.length} lines
            </span>
          </div>
        </div>
      )}

      <AlertDialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !isFlushing) {
            setIsConfirmOpen(false)
            setPendingStream(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className='text-destructive'>
              <Eraser strokeWidth={2} />
            </AlertDialogMedia>
            <AlertDialogTitle>Flush logs?</AlertDialogTitle>
            <AlertDialogDescription>
              {`This permanently deletes the selected log data for ${processName} on ${server.server}. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='space-y-2.5'>
            <div className='flex items-center justify-between gap-3 text-xs'>
              <span className='text-muted-foreground'>Stream</span>
              <span className='font-medium'>
                {pendingStream === null ? '—' : LOG_STREAM_LABELS[pendingStream]}
              </span>
            </div>

            <div className='space-y-1.5'>
              <span className='text-xs text-muted-foreground'>Scope</span>
              <div className='grid grid-cols-3 gap-0.5 rounded-md bg-muted/50 p-0.5'>
                {LOG_SCOPE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type='button'
                    size='sm'
                    variant={scope === option.value ? 'secondary' : 'ghost'}
                    className='h-9 px-2 text-xs lg:h-6'
                    disabled={isFlushing}
                    onClick={() => setScope(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <p className='text-[11px] text-muted-foreground'>
                {LOG_SCOPE_OPTIONS.find((option) => option.value === scope)?.hint}
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isFlushing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant='destructive'
              disabled={isFlushing || pendingStream === null}
              onClick={() => void confirmFlush()}
            >
              {isFlushing && <Spinner className='size-4' />}
              Flush logs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Process details — the scrollable content of the process sheet
// ---------------------------------------------------------------------------

type ProcessDetailsProps = {
  server: RegisteredServer
  /** The list snapshot, used for the identity tiles. */
  process: ProcessSummary
  describe: {
    status: LoadStatus
    data: ProcessDescribe | null
    requestError: ApiError | null
    retry: () => void
  }
  /** Total RAM of the host, when known; enables the memory share %. */
  totalMemoryBytes: number | null
  logs: LogsEntry | undefined
}

/** Loading / error / ready states for tabs that depend on the describe payload. */
function WithDescribe({
  describe,
  children,
}: {
  describe: ProcessDetailsProps['describe']
  children: (data: ProcessDescribe) => React.ReactNode
}) {
  if (describe.status === 'loading') {
    return (
      <div className='flex items-center justify-center gap-2 py-8 text-muted-foreground'>
        <Spinner className='size-4' />
        Loading details…
      </div>
    )
  }
  if (describe.status === 'error' && describe.requestError) {
    return <ErrorAlert error={describe.requestError} onRetry={describe.retry} />
  }
  if (describe.status === 'success' && describe.data) return <>{children(describe.data)}</>
  return null
}

function IdentityTile({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-lg bg-muted/50 p-3'>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p className='mt-0.5 truncate font-mono text-sm font-medium' title={value}>
        {value}
      </p>
    </div>
  )
}

/**
 * Identity tiles plus Overview / Config / Logs tabs. Tab and accordion state is
 * internal; remount the component with a per-process `key` to reset it.
 */
export function ProcessDetails({
  server,
  process,
  describe,
  totalMemoryBytes,
  logs,
}: ProcessDetailsProps) {
  const [tab, setTab] = useState<TabValue>('overview')
  const [configOpen, setConfigOpen] = useState<string[]>(DEFAULT_CONFIG_OPEN)
  const loadLogs = useProcessLogsStore((state) => state.load)

  // Fetch logs when the Logs tab opens (the store serves the in-memory
  // timeline first and only refetches when it is stale).
  useEffect(() => {
    if (tab !== 'logs') return
    void loadLogs(server, process.pm_id)
  }, [tab, server, process.pm_id, loadLogs])

  return (
    <div className='flex min-h-0 flex-1 flex-col px-4 pb-4 sm:px-6 sm:pb-6'>
      <div className='grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2'>
        <IdentityTile label='Server' value={orDash(server.server)} />
        <IdentityTile label='Host' value={`${server.host}:${server.port}`} />
        <IdentityTile label='PID' value={orDash(process.pid)} />
        <IdentityTile label='PM ID' value={orDash(process.pm_id)} />
      </div>
      <Separator className='my-5 shrink-0' />

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as TabValue)}
        className='min-h-0 flex-1'
      >
        <TabsList variant='line' className='w-full shrink-0 justify-start overflow-hidden'>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='metrics'>Metrics</TabsTrigger>
          <TabsTrigger value='config'>Config</TabsTrigger>
          <TabsTrigger value='logs'>Logs</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='flex min-h-0 flex-1 flex-col pt-4'>
          <ScrollArea className='min-h-0 flex-1'>
            <WithDescribe describe={describe}>
              {(data) => (
                <OverviewTab
                  data={data}
                  totalMemoryBytes={totalMemoryBytes}
                />
              )}
            </WithDescribe>
          </ScrollArea>
        </TabsContent>

        <TabsContent value='metrics' className='flex min-h-0 flex-1 flex-col pt-4'>
          <Suspense
            fallback={
              <div className='flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground'>
                <Spinner className='size-4' />
                Loading metrics…
              </div>
            }
          >
            <ProcessMetricsTab
              server={server}
              process={process}
              totalMemoryBytes={totalMemoryBytes}
              active={tab === 'metrics'}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value='config' className='flex min-h-0 flex-1 flex-col pt-2'>
          <ScrollArea className='min-h-0 flex-1'>
            <WithDescribe describe={describe}>
              {(data) => (
                <ConfigTab data={data} open={configOpen} onOpenChange={setConfigOpen} />
              )}
            </WithDescribe>
          </ScrollArea>
        </TabsContent>

        <TabsContent value='logs' className='flex min-h-0 flex-1 flex-col pt-4'>
          <LogsTab server={server} pmId={process.pm_id} processName={process.name} logs={logs} />
        </TabsContent>
      </Tabs>
    </div>
  )
}