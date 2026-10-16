import { useEffect, useState } from 'react'
import { Check, RefreshCw, X } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { ErrorAlert } from '@/components/custom/error-alert'
import {
  formatBytes,
  formatLogTimestamp,
  formatMetricValue,
  formatPercent,
  formatUptime,
  memorySharePercent,
} from '@/lib/format'
import { ADVANCED_GROUPS } from '@/lib/process-fields'
import {
  advancedRegistrationFields,
  basicRegistrationFields,
  type RegistrationField,
} from '@/lib/process-registration'
import { getStatusVisual } from '@/lib/status-styles'
import { toneSurfaceClasses } from '@/lib/status-tone'
import { cn } from '@/lib/utils'
import {
  LOGS_DEFAULT_TAIL,
  LOGS_TAIL_OPTIONS,
  useProcessLogsStore,
  type LogsEntry,
} from '@/stores/process-logs.store'
import type { ApiError } from '@/types/api'
import type { LoadStatus } from '@/types/dashboard'
import type { ProcessDescribe, ProcessSummary } from '@/types/process'
import type { RegisteredServer } from '@/types/server'

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

function truncatePath(path: string | null | undefined, segments = 2): string {
  if (!path || path.trim() === '') return '—'
  const parts = path.split(/[\\/]/).filter(Boolean)
  if (parts.length <= segments) return path
  return `…\\${parts.slice(-segments).join('\\')}`
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
  tone = 'default',
}: {
  label: string
  value: string
  tone?: Tone
}) {
  return (
    <div className={cn('rounded-lg p-3', statToneClasses(tone))}>
      <p className={cn('text-xs', statLabelClasses(tone))}>{label}</p>
      <p className={cn('mt-0.5 text-base font-medium', tone !== 'default' && statLabelClasses(tone))}>
        {value}
      </p>
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
    <div className='flex items-center justify-between py-0.5 text-sm'>
      <span className='text-muted-foreground'>{label}</span>
      <span className='min-w-0 truncate text-right'>{orDash(value)}</span>
    </div>
  )
}

/** Renders a registration value; arrays join with commas, booleans as words. */
function formatRegistrationValue(value: unknown): string {
  if (value === undefined || value === null) return '—'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—'
  if (typeof value === 'string' && value.trim() === '') return '—'
  return String(value)
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

function RegistrationRow({ field }: { field: RegistrationField }) {
  const value = formatRegistrationValue(field.value)

  return (
    <div className='flex items-center justify-between gap-3 py-0.5 text-sm'>
      <span className='flex min-w-0 items-center gap-1.5 text-muted-foreground'>
        <span className='truncate'>{field.spec.label}</span>
        {field.isDefault && <DefaultBadge />}
      </span>
      <span
        className='min-w-0 truncate text-right font-mono text-xs text-foreground/80'
        title={value === '—' ? undefined : value}
      >
        {value}
      </span>
    </div>
  )
}

function PathRow({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className='flex items-start justify-between gap-3 py-0.5 font-mono text-xs'>
      <span className='shrink-0 text-muted-foreground'>{label}</span>
      <span className='min-w-0 break-all text-right text-foreground/80'>
        {value && value.trim() !== '' ? value : '—'}
      </span>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className='mb-2.5 text-xs font-medium text-muted-foreground'>{children}</p>
}

// ---------------------------------------------------------------------------
// Detail body — rendered once the describe payload is available
// ---------------------------------------------------------------------------

function ProcessDetailsBody({
  data,
  server,
  totalMemoryBytes,
  pathsOpen,
  onPathsOpenChange,
  logsOpen,
  onLogsOpenChange,
  logs,
}: {
  data: ProcessDescribe
  server: RegisteredServer
  /** Total RAM of the host, when known; enables the memory share %. */
  totalMemoryBytes: number | null
  pathsOpen: boolean
  onPathsOpenChange: (open: boolean) => void
  logsOpen: boolean
  onLogsOpenChange: (open: boolean) => void
  logs: LogsEntry | undefined
}) {
  const { summary, describe, metrics } = data
  const metricEntries = Object.entries(metrics)
  const pmId = summary.pm_id
  const tail = logs?.tail ?? LOGS_DEFAULT_TAIL
  const setTail = useProcessLogsStore((state) => state.setTail)
  const refreshLogs = useProcessLogsStore((state) => state.refresh)
  const memoryShare = memorySharePercent(summary.memory, totalMemoryBytes)

  return (
    <div className='space-y-5'>
      {/* Live status — what the process is doing right now */}
      <section>
        <div className='mb-2.5 flex items-center justify-between'>
          <SectionLabel>Live status</SectionLabel>
          <div className='flex gap-1.5'>
            <FlagBadge label='autorestart' active={summary.autorestart ?? false} />
            <FlagBadge label='watch' active={summary.watch} />
          </div>
        </div>
        <div className='grid grid-cols-3 gap-3'>
          <StatTile label='Uptime' value={formatUptime(summary.uptime)} />
          <StatTile label='Restarts' value={orDash(summary.restarts)} />
          <StatTile
            label='Unstable restarts'
            value={orDash(summary.unstable_restarts)}
          />
        </div>
        <div className='mt-3 grid grid-cols-2 gap-3'>
          <StatTile label='CPU' value={Number.isFinite(summary.cpu) ? `${summary.cpu}%` : '—'} />
          <StatTile
            label='Memory'
            value={
              memoryShare === null
                ? formatBytes(summary.memory)
                : `${formatBytes(summary.memory)} · ${formatPercent(memoryShare)}`
            }
          />
        </div>
      </section>

      <Separator />

      {/* Registration — Basic */}
      <section>
        <SectionLabel>Registration — Basic</SectionLabel>
        <div className='space-y-0.5'>
          {basicRegistrationFields(data).map((field) => (
            <RegistrationRow key={field.spec.key} field={field} />
          ))}
        </div>
      </section>

      <Separator />

      {/* Registration — Advanced: every catalog setting, grouped as in the form */}
      <section>
        <SectionLabel>Registration — Advanced</SectionLabel>
        <div className='space-y-4'>
          {ADVANCED_GROUPS.map((group) => (
            <div key={group.id}>
              <p className='mb-1 text-xs font-medium text-muted-foreground'>
                {group.label}
              </p>
              <div className='space-y-0.5'>
                {advancedRegistrationFields(group.id, data).map((field) => (
                  <RegistrationRow key={field.spec.key} field={field} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Runtime — values with no registration field */}
      <section>
        <SectionLabel>Runtime</SectionLabel>
        <div className='grid grid-cols-2 gap-x-6'>
          {describe.node_version !== null && (
            <KeyValueRow label='Node version' value={describe.node_version} />
          )}
          {describe.node_env !== null && (
            <KeyValueRow label='Node env' value={describe.node_env} />
          )}
          {describe.version !== null && (
            <KeyValueRow label='App version' value={describe.version} />
          )}
          <KeyValueRow label='IP address' value={summary.ip_address} />
        </div>
        <KeyValueRow label='Created' value={describe.created_at} />
      </section>

      <Separator />

      {/* Custom metrics — raw pmx probes, mirroring pm2 describe/monit */}
      <section>
        <SectionLabel>Custom metrics</SectionLabel>
        {metricEntries.length > 0 ? (
          <div className='grid grid-cols-2 gap-x-6'>
            {metricEntries.map(([key, metric]) => (
              <KeyValueRow key={key} label={key} value={formatMetricValue(metric)} />
            ))}
          </div>
        ) : (
          <p className='text-sm text-muted-foreground'>No custom metrics</p>
        )}
      </section>

      <Separator />

      {/* Paths and logs — collapsed by default, low priority during triage */}
      <Accordion
        value={pathsOpen ? ['paths-and-logs'] : []}
        onValueChange={(value) => onPathsOpenChange(value.includes('paths-and-logs'))}
        className='rounded-none border-0'
      >
        <AccordionItem
          value='paths-and-logs'
          className='border-0 data-open:bg-transparent'
        >
          <AccordionTrigger className='p-0 hover:no-underline'>
            <SectionLabel>Paths and Commands</SectionLabel>
          </AccordionTrigger>
          <AccordionContent className='-mx-2 space-y-1 pt-1 pb-0'>
            <PathRow label='out log' value={truncatePath(describe.out_log_path)} />
            <PathRow label='error log' value={truncatePath(describe.error_log_path)} />
            <PathRow label='pid file' value={truncatePath(describe.pid_path)} />
            {describe.entire_log_path && (
              <PathRow label='entire log path' value={truncatePath(describe.entire_log_path)} />
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Logs — merged out/error timeline, collapsed by default */}
      <Accordion
        value={logsOpen ? ['logs'] : []}
        onValueChange={(value) => onLogsOpenChange(value.includes('logs'))}
        className='rounded-none border-0'
      >
        <AccordionItem value='logs' className='border-0 data-open:bg-transparent'>
          <AccordionTrigger className='p-0 hover:no-underline'>
            <SectionLabel>Logs</SectionLabel>
          </AccordionTrigger>
          <AccordionContent className='-mx-2 pt-1 pb-0'>
            <div className='mb-2 flex items-center justify-between gap-2'>
              <div className='flex items-center gap-2'>
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
              </div>
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                aria-label='Refresh logs'
                title='Refresh logs'
                disabled={logs?.refreshing}
                onClick={() => void refreshLogs(server, pmId)}
              >
                <RefreshCw
                  strokeWidth={2}
                  className={cn(logs?.refreshing && 'animate-spin')}
                />
              </Button>
            </div>

            {!logs || logs.status === 'loading' ? (
              <div className='flex items-center gap-2 py-4 text-xs text-muted-foreground'>
                <Spinner className='size-4' />
                Loading logs…
              </div>
            ) : logs.status === 'error' && logs.lines.length === 0 ? (
              logs.requestError ? (
                <ErrorAlert
                  error={logs.requestError}
                  onRetry={() => void refreshLogs(server, pmId)}
                />
              ) : null
            ) : logs.lines.length === 0 ? (
              <p className='py-2 text-xs text-muted-foreground'>No logs</p>
            ) : (
              <ScrollArea className='max-h-72 rounded-md border bg-muted/30 **:data-[slot=scroll-area-viewport]:max-h-72'>
                <div className='p-2'>
                  {logs.lines.map((line) => (
                    <div key={line.id} className='flex gap-2 py-0.5 font-mono text-xs'>
                      <span
                        className='shrink-0 tabular-nums text-muted-foreground'
                        title={line.timestamp ?? undefined}
                      >
                        {formatLogTimestamp(line.timestamp)}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 font-medium uppercase',
                          line.stream === 'error'
                            ? 'text-destructive'
                            : 'text-muted-foreground',
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
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

/**
 * Identity tiles plus the process detail body. The Paths/Logs accordion state
 * is internal; remount the component with a per-process `key` to reset it.
 */
export function ProcessDetails({
  server,
  process,
  describe,
  totalMemoryBytes,
  logs,
}: ProcessDetailsProps) {
  const [pathsOpen, setPathsOpen] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)
  const loadLogs = useProcessLogsStore((state) => state.load)

  // Fetch logs when the Logs accordion opens (the store serves the in-memory
  // timeline first and only refetches when it is stale).
  useEffect(() => {
    if (!logsOpen) return
    void loadLogs(server, process.pm_id)
  }, [logsOpen, server, process.pm_id, loadLogs])

  return (
    <div className='px-6 pb-6'>
      <div className='grid grid-cols-2 gap-3'>
        <div className='rounded-lg bg-muted/50 p-3'>
          <p className='text-xs text-muted-foreground'>Server</p>
          <p className='mt-0.5 truncate font-mono text-sm font-medium'>
            {orDash(server.server)}
          </p>
        </div>
        <div className='rounded-lg bg-muted/50 p-3'>
          <p className='text-xs text-muted-foreground'>Host</p>
          <p className='mt-0.5 truncate font-mono text-sm font-medium'>
            {server.host}:{server.port}
          </p>
        </div>
        <div className='rounded-lg bg-muted/50 p-3'>
          <p className='text-xs text-muted-foreground'>PID</p>
          <p className='mt-0.5 truncate font-mono text-sm font-medium'>
            {orDash(process.pid)}
          </p>
        </div>
        <div className='rounded-lg bg-muted/50 p-3'>
          <p className='text-xs text-muted-foreground'>PM ID</p>
          <p className='mt-0.5 truncate font-mono text-sm font-medium'>
            {orDash(process.pm_id)}
          </p>
        </div>
      </div>
      <Separator className='my-5' />

      {describe.status === 'loading' && (
        <div className='flex items-center justify-center gap-2 py-8 text-muted-foreground'>
          <Spinner className='size-4' />
          Loading details…
        </div>
      )}
      {describe.status === 'error' && describe.requestError && (
        <ErrorAlert error={describe.requestError} onRetry={describe.retry} />
      )}
      {describe.status === 'success' && describe.data && (
        <ProcessDetailsBody
          data={describe.data}
          server={server}
          totalMemoryBytes={totalMemoryBytes}
          pathsOpen={pathsOpen}
          onPathsOpenChange={setPathsOpen}
          logsOpen={logsOpen}
          onLogsOpenChange={setLogsOpen}
          logs={logs}
        />
      )}
    </div>
  )
}
