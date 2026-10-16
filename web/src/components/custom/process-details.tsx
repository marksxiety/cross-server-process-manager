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
import { ErrorAlert } from '@/components/custom/error-alert'
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
import type { ApiError } from '@/types/api'
import type { LoadStatus } from '@/types/dashboard'
import type { ProcessDescribe, ProcessSummary } from '@/types/process'
import type { RegisteredServer } from '@/types/server'

type TabValue = 'overview' | 'config' | 'logs'

const DEFAULT_OVERVIEW_OPEN = ['paths']
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
}: {
  label: string
  value: string
  /** Quiet qualifier beside the value, e.g. "0 unstable" or "3.1%". */
  sub?: string
  /** 0–100; draws a thin bar under the value. */
  progress?: number | null
  tone?: Tone
}) {
  return (
    <div className={cn('rounded-lg p-3', statToneClasses(tone))}>
      <p className={cn('text-xs', statLabelClasses(tone))}>{label}</p>
      <p
        className={cn(
          'mt-0.5 flex items-baseline gap-1.5 text-base font-medium',
          tone !== 'default' && statLabelClasses(tone),
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
            toneProgressClasses[percentTone(progress)],
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
    <div className={cn('min-w-0', isWideField(spec) && 'col-span-2')}>
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
  const groups = buildConfigGroups(data)
  // Dependencies resolve against every field's value, like the form does.
  const values = Object.fromEntries(
    groups.flatMap((group) => group.fields).map((field) => [field.spec.key, field.value]),
  )

  return (
    <Accordion value={open} onValueChange={onOpenChange} className={accordionRootClass}>
      {groups.map((group) => (
        <AccordionItem key={group.id} value={group.id} className={accordionItemClass}>
          <GroupTrigger label={group.label} count={group.fields.length} />
          <AccordionContent className='pb-4'>
            <div className='grid grid-cols-2 gap-3'>
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
    </Accordion>
  )
}

// ---------------------------------------------------------------------------
// Overview — live state, quick to scan
// ---------------------------------------------------------------------------

function OverviewTab({
  data,
  totalMemoryBytes,
  open,
  onOpenChange,
}: {
  data: ProcessDescribe
  totalMemoryBytes: number | null
  open: string[]
  onOpenChange: (open: string[]) => void
}) {
  const { summary, describe, metrics } = data
  const metricEntries = Object.entries(metrics)
  const memoryShare = memorySharePercent(summary.memory, totalMemoryBytes)
  const cpuKnown = Number.isFinite(summary.cpu)

  return (
    <div className='space-y-5'>
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
          <StatTile
            label='CPU'
            value={cpuKnown ? `${summary.cpu}%` : '—'}
            progress={cpuKnown ? summary.cpu : null}
          />
          <StatTile
            label='Memory'
            value={formatBytes(summary.memory)}
            sub={memoryShare === null ? undefined : formatPercent(memoryShare)}
            progress={memoryShare}
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

      <Accordion value={open} onValueChange={onOpenChange} className={accordionRootClass}>
        <AccordionItem value='metrics' className={accordionItemClass}>
          <GroupTrigger
            label='Custom metrics'
            count={metricEntries.length > 0 ? metricEntries.length : 'none'}
          />
          <AccordionContent className='pb-4'>
            {metricEntries.length > 0 ? (
              <div className='grid grid-cols-2 gap-x-6'>
                {metricEntries.map(([key, metric]) => (
                  <KeyValueRow key={key} label={key} value={formatMetricValue(metric)} />
                ))}
              </div>
            ) : (
              <p className='text-sm text-muted-foreground'>No custom metrics</p>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value='paths' className={cn(accordionItemClass, 'border-b')}>
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
    </div>
  )
}

// ---------------------------------------------------------------------------
// Logs — merged out/error timeline
// ---------------------------------------------------------------------------

type StreamFilter = 'all' | 'error'

function LogsTab({
  server,
  pmId,
  logs,
}: {
  server: RegisteredServer
  pmId: number
  logs: LogsEntry | undefined
}) {
  const [filter, setFilter] = useState<StreamFilter>('all')
  const tail = logs?.tail ?? LOGS_DEFAULT_TAIL
  const setTail = useProcessLogsStore((state) => state.setTail)
  const refreshLogs = useProcessLogsStore((state) => state.refresh)

  const lines = logs?.lines ?? []
  const errorCount = lines.filter((line) => line.stream === 'error').length
  const visible = filter === 'error' ? lines.filter((line) => line.stream === 'error') : lines

  return (
    <div>
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
          <div className='flex gap-0.5 rounded-md bg-muted/50 p-0.5'>
            <Button
              type='button'
              size='sm'
              variant={filter === 'all' ? 'secondary' : 'ghost'}
              className='h-6 px-2.5 text-xs'
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              type='button'
              size='sm'
              variant={filter === 'error' ? 'secondary' : 'ghost'}
              className='h-6 px-2.5 text-xs'
              onClick={() => setFilter('error')}
            >
              Errors{errorCount > 0 && ` ${errorCount}`}
            </Button>
          </div>
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
          <RefreshCw strokeWidth={2} className={cn(logs?.refreshing && 'animate-spin')} />
        </Button>
      </div>

      {!logs || logs.status === 'loading' ? (
        <div className='flex items-center gap-2 py-4 text-xs text-muted-foreground'>
          <Spinner className='size-4' />
          Loading logs…
        </div>
      ) : logs.status === 'error' && logs.lines.length === 0 ? (
        logs.requestError ? (
          <ErrorAlert error={logs.requestError} onRetry={() => void refreshLogs(server, pmId)} />
        ) : null
      ) : logs.lines.length === 0 ? (
        <p className='py-2 text-xs text-muted-foreground'>No logs</p>
      ) : visible.length === 0 ? (
        <p className='py-2 text-xs text-muted-foreground'>
          No errors in the last {lines.length} lines
        </p>
      ) : (
        <>
          <ScrollArea className='max-h-96 rounded-md border bg-muted/30 **:data-[slot=scroll-area-viewport]:max-h-96'>
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
          <p className='mt-2 text-xs text-muted-foreground'>
            Showing {visible.length} of {lines.length} lines
          </p>
        </>
      )}
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
      <p className='mt-0.5 truncate font-mono text-sm font-medium'>{value}</p>
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
  const [overviewOpen, setOverviewOpen] = useState<string[]>(DEFAULT_OVERVIEW_OPEN)
  const [configOpen, setConfigOpen] = useState<string[]>(DEFAULT_CONFIG_OPEN)
  const loadLogs = useProcessLogsStore((state) => state.load)

  // Fetch logs when the Logs tab opens (the store serves the in-memory
  // timeline first and only refetches when it is stale).
  useEffect(() => {
    if (tab !== 'logs') return
    void loadLogs(server, process.pm_id)
  }, [tab, server, process.pm_id, loadLogs])

  return (
    <div className='px-6 pb-6'>
      <div className='grid grid-cols-2 gap-3'>
        <IdentityTile label='Server' value={orDash(server.server)} />
        <IdentityTile label='Host' value={`${server.host}:${server.port}`} />
        <IdentityTile label='PID' value={orDash(process.pid)} />
        <IdentityTile label='PM ID' value={orDash(process.pm_id)} />
      </div>
      <Separator className='my-5' />

      <Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)}>
        <TabsList variant='line' className='w-full justify-start'>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='config'>Config</TabsTrigger>
          <TabsTrigger value='logs'>Logs</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='pt-4'>
          <WithDescribe describe={describe}>
            {(data) => (
              <OverviewTab
                data={data}
                totalMemoryBytes={totalMemoryBytes}
                open={overviewOpen}
                onOpenChange={setOverviewOpen}
              />
            )}
          </WithDescribe>
        </TabsContent>

        <TabsContent value='config' className='pt-2'>
          <WithDescribe describe={describe}>
            {(data) => (
              <ConfigTab data={data} open={configOpen} onOpenChange={setConfigOpen} />
            )}
          </WithDescribe>
        </TabsContent>

        <TabsContent value='logs' className='pt-4'>
          <LogsTab server={server} pmId={process.pm_id} logs={logs} />
        </TabsContent>
      </Tabs>
    </div>
  )
}