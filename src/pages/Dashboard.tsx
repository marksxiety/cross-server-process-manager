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
  ChevronDown,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
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
import { cn } from '@/lib/utils'
import { useDashboardStore } from '@/stores/dashboard.store'
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

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return '—'
  const mib = bytes / 1024 / 1024
  return `${mib.toFixed(1)} MiB`
}

const SECOND = 1
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const MONTH = 30 * DAY
const YEAR = 365 * DAY

/**
 * Formats an elapsed uptime (ms since the process last started, as returned
 * by the agent) by scaling the unit to whatever is most meaningful — seconds
 * up through years — with one secondary unit for precision (e.g. "2y 3mo",
 * "5d 4h").
 */
function formatUptime(uptimeMs: number): string {
  if (!Number.isFinite(uptimeMs) || uptimeMs <= 0) return '—'

  const seconds = Math.floor(uptimeMs / 1000)

  if (seconds >= YEAR) {
    const years = Math.floor(seconds / YEAR)
    const months = Math.floor((seconds % YEAR) / MONTH)
    return months > 0 ? `${years}y ${months}mo` : `${years}y`
  }
  if (seconds >= MONTH) {
    const months = Math.floor(seconds / MONTH)
    const days = Math.floor((seconds % MONTH) / DAY)
    return days > 0 ? `${months}mo ${days}d` : `${months}mo`
  }
  if (seconds >= DAY) {
    const days = Math.floor(seconds / DAY)
    const hours = Math.floor((seconds % DAY) / HOUR)
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  }
  if (seconds >= HOUR) {
    const hours = Math.floor(seconds / HOUR)
    const minutes = Math.floor((seconds % HOUR) / MINUTE)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  if (seconds >= MINUTE) {
    const minutes = Math.floor(seconds / MINUTE)
    const secs = seconds % MINUTE
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`
  }
  return `${seconds}s`
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toNumber(value: string | number | undefined): number | null {
  if (value === undefined) return null
  const num = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(num) ? num : null
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

function heapUsageTone(value: number | null): Tone {
  if (value === null) return 'default'
  if (value >= 90) return 'danger'
  if (value >= 70) return 'warning'
  return 'default'
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

function ProcessSheetBody({ data }: { data: ProcessDescribe }) {
  const { summary, describe, metrics } = data

  const heapUsage = toNumber(metrics['Heap Usage']?.value)
  const heapSize = toNumber(metrics['Heap Size']?.value)
  const usedHeapSize = toNumber(metrics['Used Heap Size']?.value)
  const loopP50 = toNumber(metrics['Event Loop Latency']?.value)
  const loopP95 = toNumber(metrics['Event Loop Latency p95']?.value)
  const activeHandles = toNumber(metrics['Active handles']?.value)
  const activeRequests = toNumber(metrics['Active requests']?.value)

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
          <StatTile
            label='Restarts'
            value={orDash(summary.restarts)}
            tone={summary.restarts > 0 ? 'warning' : 'default'}
          />
          <StatTile
            label='Unstable restarts'
            value={orDash(summary.unstable_restarts)}
            tone={summary.unstable_restarts > 0 ? 'danger' : 'default'}
          />
        </div>
      </section>

      <Separator />

      {/* Resource usage */}
      <section>
        <SectionLabel>Resource usage</SectionLabel>
        <div className='grid grid-cols-3 gap-3'>
          <StatTile label='CPU' value={Number.isFinite(summary.cpu) ? `${summary.cpu}%` : '—'} />
          <StatTile label='Memory' value={formatBytes(summary.memory)} />
          <StatTile
            label='Heap size'
            value={heapSize !== null ? `${heapSize} MiB` : '—'}
          />
          <StatTile
            label='Used heap size'
            value={usedHeapSize !== null ? `${usedHeapSize} MiB` : '—'}
          />
          <StatTile
            label='Heap usage'
            value={heapUsage !== null ? `${heapUsage}%` : '—'}
            tone={heapUsageTone(heapUsage)}
          />
          <StatTile
            label='Loop latency p50'
            value={loopP50 !== null ? `${loopP50} ms` : '—'}
          />
          <StatTile
            label='Loop latency p95'
            value={loopP95 !== null ? `${loopP95} ms` : '—'}
          />
          <StatTile
            label='Active handles'
            value={activeHandles !== null ? String(activeHandles) : '—'}
          />
          <StatTile
            label='Active requests'
            value={activeRequests !== null ? String(activeRequests) : '—'}
          />
        </div>
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
      <Collapsible>
        <CollapsibleTrigger className='group flex w-full items-center justify-between'>
          <SectionLabel>Paths and logs</SectionLabel>
          <ChevronDown className='size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180' />
        </CollapsibleTrigger>
        <CollapsibleContent className='space-y-1 pt-1'>
          <PathRow label='cwd' value={truncatePath(summary.cwd)} />
          <PathRow label='script path' value={truncatePath(describe.script_path)} />
          <PathRow label='script args' value={describe.script_args} />
          <PathRow label='interpreter args' value={describe.interpreter_args} />
          <PathRow label='out log' value={truncatePath(describe.out_log_path)} />
          <PathRow label='error log' value={truncatePath(describe.error_log_path)} />
          <PathRow label='pid file' value={truncatePath(describe.pid_path)} />
          <PathRow label='created' value={formatDate(describe.created_at)} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function Dashboard() {
  const servers = useDashboardStore((state) => state.servers)
  const serversStatus = useDashboardStore((state) => state.serversStatus)
  const serversError = useDashboardStore((state) => state.serversError)
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

  const describe = useProcessDescribe(
    selected?.server ?? null,
    selected?.process.pm_id ?? null,
  )

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
        {serversError && (
          <p className='mt-4 text-sm text-destructive'>{serversError}</p>
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
                          {entry.error && (
                            <div
                              className={cn(
                                'space-y-1 rounded-md px-2 py-1.5',
                                toneSurfaceClasses.danger,
                              )}
                            >
                              <p className='whitespace-pre-wrap wrap-break-words text-destructive'>
                                {entry.error.message}
                              </p>
                              <p className='font-mono text-muted-foreground'>
                                {entry.error.code} · HTTP {entry.error.status}
                              </p>
                            </div>
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
                              onSelect={() => setSelected({ server, process })}
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
          if (!open) setSelected(null)
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
              {describe.status === 'error' && (
                <p className='text-destructive'>{describe.error}</p>
              )}
              {describe.status === 'success' && describe.data && (
                <ProcessSheetBody data={describe.data} />
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