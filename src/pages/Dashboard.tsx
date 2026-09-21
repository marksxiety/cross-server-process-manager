import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Play, RefreshCw, RotateCcw, RotateCw, ServerOff, Trash2 } from 'lucide-react'
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Process } from '@/components/custom/process'
import { ServerHeader } from '@/components/custom/server-header'
import { useProcessDescribe } from '@/hooks/use-process-describe'
import { serverTone, toneSurfaceClasses } from '@/lib/status-tone'
import { DASHBOARD_AUTO_REFRESH_MS } from '@/lib/swr'
import { cn } from '@/lib/utils'
import { useDashboardStore } from '@/stores/dashboard.store'
import type { ProcessSummary } from '@/types/process'
import type { RegisteredServer } from '@/types/server'

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
        <SheetContent className='sm:max-w-md'>
          <SheetHeader>
            <SheetTitle>{selected?.server.server ?? ''}</SheetTitle>
            <SheetDescription>{selected?.server.host ?? ''}</SheetDescription>
          </SheetHeader>

          <ScrollArea className='flex-1 min-h-0'>
            <div className='space-y-4 px-6 pb-6'>
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
                <div className='space-y-4'>
                  <section className='space-y-1.5'>
                    <h3 className='font-medium text-foreground'>summary</h3>
                    <div className='space-y-1.5 pl-3'>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>pid</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.summary.pid)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>pm_id</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.summary.pm_id)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>name</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.summary.name)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>namespace</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.summary.namespace)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>status</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.summary.status)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>uptime</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.summary.uptime)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>restarts</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.summary.restarts)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>unstable_restarts</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.summary.unstable_restarts)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>exec_mode</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.summary.exec_mode)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>instances</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.summary.instances ?? '')}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>interpreter</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.summary.interpreter)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>cpu</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.summary.cpu)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>memory</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.summary.memory)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>cwd</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.summary.cwd ?? '')}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>ip_address</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.summary.ip_address)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>watch</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.summary.watch)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>autorestart</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.summary.autorestart ?? '')}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>logs</span>
                        <span className='min-w-0 break-all text-right'>{JSON.stringify(describe.data.summary.logs)}</span>
                      </div>
                    </div>
                  </section>

                  <section className='space-y-1.5'>
                    <h3 className='font-medium text-foreground'>describe</h3>
                    <div className='space-y-1.5 pl-3'>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>version</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.describe.version)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>script_path</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.describe.script_path)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>script_args</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.describe.script_args ?? '')}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>error_log_path</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.describe.error_log_path)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>out_log_path</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.describe.out_log_path)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>pid_path</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.describe.pid_path)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>interpreter_args</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.describe.interpreter_args ?? '')}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>node_version</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.describe.node_version)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>node_env</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.describe.node_env)}</span>
                      </div>
                      <div className='flex items-start justify-between gap-4 py-0.5'>
                        <span className='shrink-0 text-muted-foreground'>created_at</span>
                        <span className='min-w-0 break-all text-right'>{String(describe.data.describe.created_at)}</span>
                      </div>
                    </div>
                  </section>

                  <section className='space-y-1.5'>
                    <h3 className='font-medium text-foreground'>metrics</h3>
                    <div className='space-y-1.5 pl-3'>
                      <section className='space-y-1.5'>
                        <h4 className='font-medium text-foreground'>Heap Size</h4>
                        <div className='space-y-1.5 pl-3'>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>historic</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Heap Size']?.historic ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>unit</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Heap Size']?.unit ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>type</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Heap Size']?.type ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>value</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Heap Size']?.value ?? '')}</span>
                          </div>
                        </div>
                      </section>

                      <section className='space-y-1.5'>
                        <h4 className='font-medium text-foreground'>Heap Usage</h4>
                        <div className='space-y-1.5 pl-3'>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>historic</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Heap Usage']?.historic ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>unit</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Heap Usage']?.unit ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>type</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Heap Usage']?.type ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>value</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Heap Usage']?.value ?? '')}</span>
                          </div>
                        </div>
                      </section>

                      <section className='space-y-1.5'>
                        <h4 className='font-medium text-foreground'>Used Heap Size</h4>
                        <div className='space-y-1.5 pl-3'>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>historic</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Used Heap Size']?.historic ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>unit</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Used Heap Size']?.unit ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>type</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Used Heap Size']?.type ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>value</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Used Heap Size']?.value ?? '')}</span>
                          </div>
                        </div>
                      </section>

                      <section className='space-y-1.5'>
                        <h4 className='font-medium text-foreground'>Active requests</h4>
                        <div className='space-y-1.5 pl-3'>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>historic</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Active requests']?.historic ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>unit</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Active requests']?.unit ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>type</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Active requests']?.type ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>value</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Active requests']?.value ?? '')}</span>
                          </div>
                        </div>
                      </section>

                      <section className='space-y-1.5'>
                        <h4 className='font-medium text-foreground'>Active handles</h4>
                        <div className='space-y-1.5 pl-3'>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>historic</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Active handles']?.historic ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>unit</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Active handles']?.unit ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>type</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Active handles']?.type ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>value</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Active handles']?.value ?? '')}</span>
                          </div>
                        </div>
                      </section>

                      <section className='space-y-1.5'>
                        <h4 className='font-medium text-foreground'>Event Loop Latency</h4>
                        <div className='space-y-1.5 pl-3'>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>historic</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Event Loop Latency']?.historic ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>unit</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Event Loop Latency']?.unit ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>type</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Event Loop Latency']?.type ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>value</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Event Loop Latency']?.value ?? '')}</span>
                          </div>
                        </div>
                      </section>

                      <section className='space-y-1.5'>
                        <h4 className='font-medium text-foreground'>Event Loop Latency p95</h4>
                        <div className='space-y-1.5 pl-3'>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>historic</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Event Loop Latency p95']?.historic ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>unit</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Event Loop Latency p95']?.unit ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>type</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Event Loop Latency p95']?.type ?? '')}</span>
                          </div>
                          <div className='flex items-start justify-between gap-4 py-0.5'>
                            <span className='shrink-0 text-muted-foreground'>value</span>
                            <span className='min-w-0 break-all text-right'>{String(describe.data.metrics['Event Loop Latency p95']?.value ?? '')}</span>
                          </div>
                        </div>
                      </section>
                    </div>
                  </section>
                </div>
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
