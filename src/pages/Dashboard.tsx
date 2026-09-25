import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Check,
  Circle,
  Play,
  RefreshCw,
  RotateCcw,
  RotateCw,
  ServerOff,
  Trash2,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { ErrorAlert } from '@/components/custom/error-alert'
import { Process } from '@/components/custom/process'
import { ServerHeader } from '@/components/custom/server-header'
import { useProcessDescribe } from '@/hooks/use-process-describe'
import {
  processTone,
  serverTone,
  toneBadgeVariant,
  toneSurfaceClasses,
} from '@/lib/status-tone'
import { DASHBOARD_AUTO_REFRESH_MS } from '@/lib/swr'
import { formatArgs, formatBytes, formatLogTimestamp, formatMetricValue, formatUptime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useDashboardStore } from '@/stores/dashboard.store'
import {
  LOGS_DEFAULT_TAIL,
  LOGS_TAIL_OPTIONS,
  logKey,
  useProcessLogsStore,
  type LogsEntry,
} from '@/stores/process-logs.store'
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
        <Check className='size-3 text-emerald-600 dark:text-emerald-400' strokeWidth={2.5} />
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
// Process detail sheet body
// ---------------------------------------------------------------------------

function ProcessSheetBody({
  data,
  server,
  pathsOpen,
  onPathsOpenChange,
  logsOpen,
  onLogsOpenChange,
  logs,
}: {
  data: ProcessDescribe
  server: RegisteredServer
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

  return (
    <div className='space-y-5'>
      {/* Health */}
      <section>
        <div className='mb-2.5 flex items-center justify-between'>
          <SectionLabel>Health</SectionLabel>
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
      </section>

      <Separator />

      {/* Resource usage */}
      <section>
        <SectionLabel>Resource usage</SectionLabel>
        <div className='grid grid-cols-2 gap-3'>
          <StatTile label='CPU' value={Number.isFinite(summary.cpu) ? `${summary.cpu}%` : '—'} />
          <StatTile label='Memory' value={formatBytes(summary.memory)} />
        </div>
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

      {/* Runtime */}
      <section>
        <SectionLabel>Runtime</SectionLabel>
        <div className='grid grid-cols-2 gap-x-6'>
          <KeyValueRow label='Exec mode' value={summary.exec_mode} />
          <KeyValueRow label='Interpreter' value={summary.interpreter} />
          <KeyValueRow label='Node version' value={describe.node_version} />
          <KeyValueRow label='Node env' value={describe.node_env} />
          <KeyValueRow label='App version' value={describe.version} />
          <KeyValueRow label='IP address' value={summary.ip_address} />
        </div>
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
            <PathRow label='cwd' value={truncatePath(summary.cwd)} />
            <PathRow label='script path' value={truncatePath(describe.script_path)} />
            <PathRow label='script args' value={formatArgs(describe.script_args)} />
            <PathRow label='interpreter args' value={formatArgs(describe.interpreter_args)} />
            <PathRow label='out log' value={truncatePath(describe.out_log_path)} />
            <PathRow label='error log' value={truncatePath(describe.error_log_path)} />
            <PathRow label='pid file' value={truncatePath(describe.pid_path)} />
            {describe.entire_log_path && (
              <PathRow label='entire log path' value={truncatePath(describe.entire_log_path)} />
            )}
            {describe.cron_restart && (
              <PathRow label='cron restart' value={describe.cron_restart} />
            )}
            {describe.max_memory_restart !== undefined && (
              <PathRow
                label='max memory restart'
                value={String(describe.max_memory_restart)}
              />
            )}
            <PathRow label='created' value={orDash(describe.created_at)} />
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
// Dashboard
// ---------------------------------------------------------------------------

export function Dashboard() {
  const servers = useDashboardStore((state) => state.servers)
  const serversStatus = useDashboardStore((state) => state.serversStatus)
  const registryRequestError = useDashboardStore((state) => state.requestError)
  const processesByServer = useDashboardStore((state) => state.processesByServer)
  const isRefreshing = useDashboardStore((state) => state.isRefreshing)
  const load = useDashboardStore((state) => state.load)
  const refresh = useDashboardStore((state) => state.refresh)
  const reload = useDashboardStore((state) => state.reload)

  const [openServers, setOpenServers] = useState<string[] | null>(null)
  const [selected, setSelected] = useState<{
    server: RegisteredServer
    process: ProcessSummary
  } | null>(null)
  const [pathsOpen, setPathsOpen] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)

  const describe = useProcessDescribe(
    selected?.server ?? null,
    selected?.process.pm_id ?? null,
  )

  const logs = useProcessLogsStore((state) =>
    selected
      ? state.entries[logKey(selected.server, selected.process.pm_id)]
      : undefined,
  )
  const loadLogs = useProcessLogsStore((state) => state.load)

  const selectedTone = selected
    ? processTone(selected.process.status)
    : 'neutral'

  const defaultOpen = useMemo(
    () =>
      servers
        .filter((s) => serverTone(processesByServer[s.server]) !== 'success')
        .map((s) => s.server),
    [servers, processesByServer],
  )

  const openList = openServers ?? defaultOpen

  const handleOpenChange = (serverName: string, isOpen: boolean) => {
    setOpenServers(
      isOpen
        ? [...openList, serverName]
        : openList.filter((name) => name !== serverName),
    )
  }

  useEffect(() => {
    void load()
  }, [load])

  // Fetch logs when the Logs accordion opens (the store serves the in-memory
  // timeline first and only refetches when it is stale).
  useEffect(() => {
    if (!logsOpen || !selected) return
    void loadLogs(selected.server, selected.process.pm_id)
  }, [logsOpen, selected, loadLogs])

  useEffect(() => {
    const intervalId = setInterval(
      () => void refresh(),
      DASHBOARD_AUTO_REFRESH_MS,
    )
    return () => clearInterval(intervalId)
  }, [refresh])

  return (
    <ScrollArea className='h-full'>
      <div className='p-4'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-semibold tracking-tight'>
            Servers Overview
          </h1>

          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='icon-sm'
              onClick={() => void reload()}
              disabled={serversStatus === 'loading' || isRefreshing}
              aria-label='Refresh servers and processes'
              title='Refresh servers and processes'
            >
              <RefreshCw
                strokeWidth={2}
                className={cn(isRefreshing && 'animate-spin')}
              />
            </Button>
          </div>
        </div>

        {serversStatus === 'loading' && (
          <div className='mt-4 flex items-center gap-2 text-sm text-muted-foreground'>
            <Spinner className='size-4' />
            Loading servers…
          </div>
        )}
        {registryRequestError && (
          <ErrorAlert error={registryRequestError} className='mt-4' />
        )}

        {serversStatus === 'success' && servers.length === 0 && (
          <Empty className='mt-4'>
            <EmptyHeader>
              <EmptyMedia variant='icon'>
                <ServerOff strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>No registered servers</EmptyTitle>
              <EmptyDescription>
                No servers are registered yet. Register a server to start
                monitoring its processes.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button render={<Link to='/server' />}>Register a server</Button>
            </EmptyContent>
          </Empty>
        )}

        {serversStatus === 'success' && servers.length > 0 && (
          <div className='mt-4 space-y-2'>
            {servers.map((server) => {
              const entry = processesByServer[server.server]
              const processes =
                entry?.status === 'success' ? entry.processes : []
              const canExpand =
                entry?.status === 'error' || processes.length > 0

              return (
                <Card key={server.server}>
                  <Accordion
                    value={
                      openList.includes(server.server) ? [server.server] : []
                    }
                    onValueChange={(value) =>
                      handleOpenChange(
                        server.server,
                        value.includes(server.server),
                      )
                    }
                    className='rounded-none border-0'
                  >
                    <AccordionItem
                      value={server.server}
                      className='border-0 data-open:bg-transparent'
                    >
                      <AccordionTrigger
                        className='px-(--card-spacing) py-2.5 hover:no-underline'
                        disabled={!canExpand}
                      >
                        <ServerHeader server={server} entry={entry} />
                      </AccordionTrigger>
                      {entry?.status === 'error' ? (
                        <AccordionContent className='relative pb-2 pl-9'>
                          <Separator
                            orientation='vertical'
                            className='absolute left-4 top-0 bottom-2'
                          />
                          {entry.requestError && (
                            <ErrorAlert error={entry.requestError} />
                          )}
                        </AccordionContent>
                      ) : canExpand ? (
                        <AccordionContent className='relative space-y-0.5 pb-2 pl-9'>
                          <Separator
                            orientation='vertical'
                            className='absolute left-4 top-0 bottom-2'
                          />
                          {processes.map((process) => (
                            <Process
                              key={process.pm_id}
                              process={process}
                              onSelect={() => {
                                setSelected({ server, process })
                                setPathsOpen(false)
                                setLogsOpen(false)
                              }}
                            />
                          ))}
                        </AccordionContent>
                      ) : null}
                    </AccordionItem>
                  </Accordion>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null)
            setPathsOpen(false)
            setLogsOpen(false)
          }
        }}
      >
        <SheetContent size='lg'>
          <SheetHeader>
            <div className='flex items-start justify-between gap-3 pr-6'>
              <div className='flex min-w-0 items-center gap-2'>
                <SheetTitle className='truncate'>
                  {selected?.process.name ?? ''}
                </SheetTitle>
                {selected && (
                  <Badge
                    variant='outline'
                    className='shrink-0 font-normal text-muted-foreground'
                  >
                    {selected.process.namespace}
                  </Badge>
                )}
              </div>
              {selected && (
                <Badge
                  variant={toneBadgeVariant[selectedTone]}
                  className='shrink-0 gap-1.5 font-normal'
                >
                  <Circle
                    className={cn(
                      'fill-current',
                      selectedTone === 'success' && 'animate-pulse',
                    )}
                    strokeWidth={0}
                  />
                  {selected.process.status}
                </Badge>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className='flex-1 min-h-0'>
            <div className='px-6 pb-6'>
              {selected && (
                <>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='rounded-lg bg-muted/50 p-3'>
                      <p className='text-xs text-muted-foreground'>Server</p>
                      <p className='mt-0.5 truncate font-mono text-sm font-medium'>
                        {orDash(selected.server.server)}
                      </p>
                    </div>
                    <div className='rounded-lg bg-muted/50 p-3'>
                      <p className='text-xs text-muted-foreground'>Host</p>
                      <p className='mt-0.5 truncate font-mono text-sm font-medium'>
                        {selected.server.host}:{selected.server.port}
                      </p>
                    </div>
                    <div className='rounded-lg bg-muted/50 p-3'>
                      <p className='text-xs text-muted-foreground'>PID</p>
                      <p className='mt-0.5 truncate font-mono text-sm font-medium'>
                        {orDash(selected.process.pid)}
                      </p>
                    </div>
                    <div className='rounded-lg bg-muted/50 p-3'>
                      <p className='text-xs text-muted-foreground'>PM ID</p>
                      <p className='mt-0.5 truncate font-mono text-sm font-medium'>
                        {orDash(selected.process.pm_id)}
                      </p>
                    </div>
                  </div>
                  <Separator className='my-5' />
                </>
              )}
              {describe.status === 'loading' && (
                <div className='flex items-center justify-center gap-2 py-8 text-muted-foreground'>
                  <Spinner className='size-4' />
                  Loading details…
                </div>
              )}
              {describe.status === 'error' && describe.requestError && (
                <ErrorAlert
                  error={describe.requestError}
                  onRetry={describe.retry}
                />
              )}
              {describe.status === 'success' && describe.data && selected && (
                <ProcessSheetBody
                  data={describe.data}
                  server={selected.server}
                  pathsOpen={pathsOpen}
                  onPathsOpenChange={setPathsOpen}
                  logsOpen={logsOpen}
                  onLogsOpenChange={setLogsOpen}
                  logs={logs}
                />
              )}
            </div>
          </ScrollArea>

          <SheetFooter className='grid grid-cols-2 gap-2'>
            <Button type='button' variant='outline' className='w-full'>
              <Play strokeWidth={2} />
              Start
            </Button>
            <Button type='button' variant='outline' className='w-full'>
              <RotateCw strokeWidth={2} />
              Reload
            </Button>
            <Button type='button' variant='outline' className='w-full'>
              <RotateCcw strokeWidth={2} />
              Restart
            </Button>
            <Button type='button' variant='destructive' className='w-full'>
              <Trash2 strokeWidth={2} />
              Delete
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </ScrollArea>
  )
}