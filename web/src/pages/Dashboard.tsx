import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  ArrowUpDown,
  Circle,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Search,
  ServerOff,
  Trash2,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { ErrorAlert } from '@/components/custom/error-alert'
import { PageLoader } from '@/components/custom/page-loader'
import { ProcessCard } from '@/components/custom/process-card'
import { ProcessDetails } from '@/components/custom/process-details'
import { ServerHeader } from '@/components/custom/server-header'
import { useFlipReorder } from '@/hooks/use-flip-reorder'
import { useAccess } from '@/hooks/use-access'
import { useProcessDescribe } from '@/hooks/use-process-describe'
import { errorCodeLabel, toApiError } from '@/lib/error-code'
import { canRunProcessCommand } from '@/lib/process-runtime'
import { processItemKey, sortProcesses } from '@/lib/sort-processes'
import type { ProcessSortKey } from '@/lib/sort-processes'
import { getStatusContext, getStatusVisual } from '@/lib/status-styles'
import { DASHBOARD_AUTO_REFRESH_MS } from '@/lib/swr'
import { cn } from '@/lib/utils'
import { useDashboardStore, useProcessesStatus } from '@/stores/dashboard.store'
import { logKey, useProcessLogsStore } from '@/stores/process-logs.store'
import type { ApiError } from '@/types/api'
import type { ProcessCommand, ProcessSummary } from '@/types/process'
import type { RegisteredServer } from '@/types/server'



// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

const COMMAND_LABELS: Record<ProcessCommand, { loading: string; success: string }> = {
  start: { loading: 'Starting process…', success: 'Process started' },
  stop: { loading: 'Pausing process…', success: 'Process paused' },
  restart: { loading: 'Restarting process…', success: 'Process restarted' },
  reload: { loading: 'Reloading process…', success: 'Process reloaded' },
  delete: { loading: 'Deleting process…', success: 'Process deleted' },
}

// Status is always rendered first and, when checked, always ranks first
// (see sortProcesses); every option stays checkable/uncheckable.
const SORT_OPTIONS: { value: ProcessSortKey; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'name', label: 'Name' },
  { value: 'restarts', label: 'Restart Count' },
  { value: 'memory', label: 'Memory' },
  { value: 'cpu', label: 'CPU' },
  { value: 'uptime', label: 'Uptime' },
  { value: 'host', label: 'Host (Server Name)' },
  { value: 'namespace', label: 'Namespace' },
]

export function Dashboard() {
  const servers = useDashboardStore((state) => state.servers)
  const serversStatus = useDashboardStore((state) => state.serversStatus)
  const registryRequestError = useDashboardStore((state) => state.requestError)
  const processesByServer = useDashboardStore((state) => state.processesByServer)
  const isRefreshing = useDashboardStore((state) => state.isRefreshing)
  const load = useDashboardStore((state) => state.load)
  const refresh = useDashboardStore((state) => state.refresh)
  const reload = useDashboardStore((state) => state.reload)
  const isStarting = useDashboardStore((state) => state.isStarting)
  const isStopping = useDashboardStore((state) => state.isStopping)
  const isRestarting = useDashboardStore((state) => state.isRestarting)
  const isReloading = useDashboardStore((state) => state.isReloading)
  const isDeleting = useDashboardStore((state) => state.isDeleting)
  const startProcess = useDashboardStore((state) => state.startProcess)
  const stopProcess = useDashboardStore((state) => state.stopProcess)
  const restartProcess = useDashboardStore((state) => state.restartProcess)
  const reloadProcess = useDashboardStore((state) => state.reloadProcess)
  const deleteProcess = useDashboardStore((state) => state.deleteProcess)
  const sortOrder = useDashboardStore((state) => state.sortOrder)
  const setSortOrder = useDashboardStore((state) => state.setSortOrder)
  const processesStatus = useProcessesStatus()
  const access = useAccess()
  const canOpenDetails = access.isAuthenticated

  const [selected, setSelected] = useState<{
    server: RegisteredServer
    process: ProcessSummary
  } | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const describe = useProcessDescribe(
    selected?.server ?? null,
    selected?.process.pm_id ?? null,
  )

  const logs = useProcessLogsStore((state) =>
    selected
      ? state.entries[logKey(selected.server, selected.process.pm_id)]
      : undefined,
  )

  // The sheet's live view of the selected process: prefer the freshest cached
  // summary, falling back to the snapshot it was opened with.
  const selectedProcess = useMemo(() => {
    if (!selected) return null
    const entry = processesByServer[selected.server.server]
    const current = entry?.processes.find((item) => item.pm_id === selected.process.pm_id)
    return current ?? selected.process
  }, [selected, processesByServer])

  const selectedServerEntry = useMemo(
    () => (selected ? processesByServer[selected.server.server] : undefined),
    [selected, processesByServer],
  )

  const selectedVisual = getStatusVisual(selectedProcess)
  const selectedContext = selectedProcess ? getStatusContext(selectedProcess) : null
  const StatusIcon = selectedVisual.icon

  const isCommandPending =
    isStarting || isStopping || isRestarting || isReloading || isDeleting
  const isActionDisabled = isCommandPending || describe.isDescribing

  const showReload =
    selectedProcess !== null && canRunProcessCommand(selectedProcess, 'reload')
  const canStart = access.canDo('process.start')
  const canStop = access.canDo('process.stop')
  const canRestart = access.canDo('process.restart')
  const canReload = access.canDo('process.reload')
  const canDelete = access.canDo('process.delete')
  const showReloadButton = showReload && canReload
  const hasProcessActions = canStart || canStop || canRestart || canReload || canDelete

  const toggleSortKey = (key: ProcessSortKey) => {
    if (sortOrder.includes(key)) {
      setSortOrder(sortOrder.filter((item) => item !== key))
      return
    }
    // Re-checking status keeps it first so the menu numbering matches the sort.
    setSortOrder(key === 'status' ? [key, ...sortOrder] : [...sortOrder, key])
  }

  const runAction = async (command: Exclude<ProcessCommand, 'delete'>) => {
    if (!selected || !selectedProcess) return

    const permission = {
      start: 'process.start',
      stop: 'process.stop',
      restart: 'process.restart',
      reload: 'process.reload',
    } as const
    if (!access.canDo(permission[command])) return

    const commands = {
      start: startProcess,
      stop: stopProcess,
      restart: restartProcess,
      reload: reloadProcess,
    }
    const request = commands[command](selected.server, selectedProcess).then((result) => {
      if (!result.success) throw toApiError(result)
      return result
    })

    try {
      await toast.promise(request, {
        loading: { title: COMMAND_LABELS[command].loading },
        success: {
          title: COMMAND_LABELS[command].success,
          description: `${selectedProcess.name} on ${selected.server.server}.`,
        },
        error: (error: ApiError) => ({
          title: errorCodeLabel(error.code),
          description: error.message,
        }),
      })
      describe.retry()
    } catch {
      // toast.promise already surfaced the error; the store left the process untouched.
    }
  }

  const confirmDelete = async () => {
    if (!selected || !selectedProcess || !access.canDo('process.delete')) return

    const request = deleteProcess(selected.server, selectedProcess).then((result) => {
      if (!result.success) throw toApiError(result)
      return result
    })

    try {
      await toast.promise(request, {
        loading: { title: COMMAND_LABELS.delete.loading },
        success: {
          title: COMMAND_LABELS.delete.success,
          description: `${selectedProcess.name} was removed from ${selected.server.server}.`,
        },
        error: (error: ApiError) => ({
          title: errorCodeLabel(error.code),
          description: error.message,
        }),
      })
      setIsDeleteOpen(false)
      setSelected(null)
    } catch {
      // toast.promise already surfaced the error; keep the dialog open.
    }
  }

  // Flat, cross-server view of every process. Servers that are still loading or
  // unreachable are surfaced on their own tile instead.
  const processItems = useMemo(
    () =>
      servers.flatMap((server) => {
        const entry = processesByServer[server.server]
        if (entry?.status !== 'success') return []
        return entry.processes.map((process) => ({ server, process }))
      }),
    [servers, processesByServer],
  )

  const query = searchQuery.trim().toLowerCase()

  // Applies the name/namespace search. An empty query leaves the list
  // untouched so refreshing never shuffles results.
  const searchedProcessItems = useMemo(() => {
    if (query === '') return processItems
    return processItems.filter(
      (item) =>
        item.process.name.toLowerCase().includes(query) ||
        item.process.namespace.toLowerCase().includes(query),
    )
  }, [processItems, query])

  const sortedProcessItems = useMemo(
    () => sortProcesses(searchedProcessItems, sortOrder),
    [searchedProcessItems, sortOrder],
  )

  const orderSignature = useMemo(
    () => sortedProcessItems.map(processItemKey).join('|'),
    [sortedProcessItems],
  )

  // The centered loader only takes over while nothing has arrived yet; once a
  // single server reports its processes the grid wins and shows what is there.
  const showProcessesLoader =
    (processesStatus === 'loading' || processesStatus === 'idle') &&
    sortedProcessItems.length === 0

  // Servers whose agent could not be reached. Their processes are unknown, so
  // the area reports the failure instead of claiming there are none.
  const unreachableServerNames = useMemo(
    () =>
      servers
        .filter((server) => processesByServer[server.server]?.status === 'error')
        .map((server) => server.server),
    [servers, processesByServer],
  )

  const processGridRef = useRef<HTMLDivElement | null>(null)
  useFlipReorder({ containerRef: processGridRef, orderSignature })

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
    <div className='min-w-0'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h1 className='text-xl font-semibold tracking-tight sm:text-2xl'>
            Servers Overview
          </h1>

          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='icon'
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
          <PageLoader
            className='min-h-[40vh]'
            title='Loading servers…'
            description='Fetching the registered servers…'
          />
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
              {access.canVisit('servers') && access.canDo('server.create') ? (
                <Button render={<Link to='/server' />}>Register a server</Button>
              ) : (
                <p className='text-xs text-muted-foreground'>
                  You don&apos;t have permission to register a server.
                </p>
              )}
            </EmptyContent>
          </Empty>
        )}

        {serversStatus === 'success' && servers.length > 0 && (
          <>
            <div className='mt-4 flex flex-wrap gap-3'>
              {servers.map((server) => {
                const entry = processesByServer[server.server]

                return (
                  <Link
                    key={server.server}
                    to={`/server/${encodeURIComponent(server.server)}/metrics`}
                    aria-label={`View metrics for ${server.server}`}
                    className='@container/server block min-w-48 grow basis-[calc(20%-0.625rem)] rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  >
                    <Card className='h-full transition-shadow hover:bg-accent/40'>
                      <ServerHeader server={server} entry={entry} />
                    </Card>
                  </Link>
                )
              })}
            </div>

            <div className='mt-6 flex flex-wrap items-center gap-3'>
              <p className='shrink-0 text-xs font-medium text-muted-foreground'>
                {showProcessesLoader
                  ? 'Loading…'
                  : `Processes (${sortedProcessItems.length}${
                      query !== '' ? `/${processItems.length}` : ''
                    })`}
              </p>
              <Separator className='flex-1' />
              <div className='flex shrink-0 items-center gap-2'>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant='outline'
                        size='sm'
                        aria-label={`Sort by, ${sortOrder.length} active`}
                      />
                    }
                  >
                    <ArrowUpDown strokeWidth={2} />
                    Sort By
                    {sortOrder.length > 0 && (
                      <Badge variant='secondary' className='px-1.5 tabular-nums'>
                        {sortOrder.length}
                      </Badge>
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end' className='w-48'>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Sort order</DropdownMenuLabel>
                      {SORT_OPTIONS.map((option) => {
                        const index = sortOrder.indexOf(option.value)
                        return (
                          <DropdownMenuCheckboxItem
                            key={option.value}
                            checked={index !== -1}
                            closeOnClick={false}
                            onCheckedChange={() => toggleSortKey(option.value)}
                          >
                            {option.label}
                            {index !== -1 && (
                              <DropdownMenuShortcut>{index + 1}</DropdownMenuShortcut>
                            )}
                          </DropdownMenuCheckboxItem>
                        )
                      })}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className='relative w-full max-w-56 shrink-0'>
                <Search
                  className='pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground'
                  strokeWidth={2}
                />
                <Input
                  size='xs'
                  className='pl-7'
                  value={searchQuery}
                  placeholder='Search name or namespace…'
                  aria-label='Search processes by name or namespace'
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setSearchQuery('')
                  }}
                />
                {searchQuery !== '' && (
                  <button
                    type='button'
                    aria-label='Clear search'
                    title='Clear search'
                    className='absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground'
                    onClick={() => setSearchQuery('')}
                  >
                    <X className='size-3.5' strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>

            {sortedProcessItems.length > 0 ? (
              <div
                ref={processGridRef}
                className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              >
                {sortedProcessItems.map((item) => {
                  const key = processItemKey(item)
                  const overview = processesByServer[item.server.server]?.overview
                  return (
                    <div key={key} data-flip-key={key} className='grid'>
                      <ProcessCard
                        process={item.process}
                        serverLabel={`${item.server.server} · ${item.server.host}:${item.server.port}`}
                        totalMemoryBytes={overview?.memory.totalBytes ?? null}
                        cpuCores={overview?.cpu.cores ?? null}
                        onSelect={
                          canOpenDetails
                            ? () => {
                                setSelected({
                                  server: item.server,
                                  process: item.process,
                                })
                              }
                            : undefined
                        }
                      />
                    </div>
                  )
                })}
              </div>
            ) : showProcessesLoader ? (
              <PageLoader
                className='min-h-[40vh]'
                title='Loading processes…'
                description='Fetching processes from the registered servers…'
              />
            ) : processesStatus === 'error' ? (
              <Empty className='mt-4'>
                <EmptyHeader>
                  <EmptyMedia variant='icon'>
                    <ServerOff strokeWidth={2} />
                  </EmptyMedia>
                  <EmptyTitle>No available processes</EmptyTitle>
                  <EmptyDescription>
                    {unreachableServerNames.length === servers.length
                      ? 'Cannot access the registered servers.'
                      : `Cannot access ${unreachableServerNames.join(', ')}.`}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : query !== '' ? (
              <Empty className='mt-4'>
                <EmptyHeader>
                  <EmptyMedia variant='icon'>
                    <Search strokeWidth={2} />
                  </EmptyMedia>
                  <EmptyTitle>No matching processes</EmptyTitle>
                  <EmptyDescription>
                    {`No process name or namespace matches “${searchQuery.trim()}”.`}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant='outline' onClick={() => setSearchQuery('')}>
                    Clear search
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <Empty className='mt-4'>
                <EmptyHeader>
                  <EmptyMedia variant='icon'>
                    <ServerOff strokeWidth={2} />
                  </EmptyMedia>
                  <EmptyTitle>No processes</EmptyTitle>
                  <EmptyDescription>
                    None of the registered servers are reporting processes.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </>
        )}

      <Sheet
        open={canOpenDetails && selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <SheetContent size='lg'>
          <SheetHeader>
            <div className='flex flex-wrap items-start justify-between gap-3 pr-8'>
              <div className='flex min-w-0 items-center gap-2'>
                <SheetTitle className='truncate'>
                  {selectedProcess?.name ?? ''}
                </SheetTitle>
                {selectedProcess && (
                  <Badge
                    variant='outline'
                    className='shrink-0 font-normal text-muted-foreground'
                  >
                    {selectedProcess.namespace}
                  </Badge>
                )}
              </div>
              {selectedProcess && (
                <Badge
                  variant='outline'
                  className={cn(
                    'shrink-0 gap-1.5 border font-normal',
                    selectedVisual.badge,
                  )}
                >
                  <Circle
                    className={cn(
                      'fill-current',
                      selectedVisual.pulse &&
                        'animate-pulse motion-reduce:animate-none',
                    )}
                    strokeWidth={0}
                  />
                  {selectedVisual.label}
                </Badge>
              )}
            </div>
            <Separator className='my-2' />
            {selectedContext && (
              <Alert
                className={cn(
                  'border',
                  selectedVisual.surface,
                  selectedVisual.text,
                  selectedVisual.border,
                )}
              >
                <StatusIcon />
                <AlertDescription className='text-current'>
                  {selectedContext}
                </AlertDescription>
              </Alert>
            )}
          </SheetHeader>

          <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
            {selected && selectedProcess && (
              <ProcessDetails
                key={processItemKey(selected)}
                server={selected.server}
                process={selectedProcess}
                describe={describe}
                totalMemoryBytes={
                  selectedServerEntry?.overview?.memory.totalBytes ?? null
                }
                cpuCores={selectedServerEntry?.overview?.cpu.cores ?? null}
                overviewStatus={selectedServerEntry?.status ?? 'idle'}
                logs={logs}
              />
            )}
          </div>

          {hasProcessActions && (
            <SheetFooter className='grid grid-cols-2 gap-2'>
              {selectedProcess?.status === 'online'
                ? canStop && (
                    <Button
                      type='button'
                      variant='outline'
                      className='w-full'
                      disabled={isActionDisabled}
                      onClick={() => void runAction('stop')}
                    >
                      {isStopping ? (
                        <Spinner className='size-4' />
                      ) : (
                        <Pause strokeWidth={2} />
                      )}
                      Pause
                    </Button>
                  )
                : canStart && (
                    <Button
                      type='button'
                      variant='outline'
                      className='w-full'
                      disabled={
                        !selectedProcess ||
                        isActionDisabled ||
                        !canRunProcessCommand(selectedProcess, 'start')
                      }
                      onClick={() => void runAction('start')}
                    >
                      {isStarting ? (
                        <Spinner className='size-4' />
                      ) : (
                        <Play strokeWidth={2} />
                      )}
                      Start
                    </Button>
                  )}

              {showReloadButton && (
                <Button
                  type='button'
                  variant='outline'
                  className='w-full'
                  disabled={isActionDisabled}
                  onClick={() => void runAction('reload')}
                >
                  {isReloading ? (
                    <Spinner className='size-4' />
                  ) : (
                    <RotateCw strokeWidth={2} />
                  )}
                  Reload
                </Button>
              )}

              {canRestart && (
                <Button
                  type='button'
                  variant='outline'
                  className='w-full'
                  disabled={
                    !selectedProcess ||
                    isActionDisabled ||
                    !canRunProcessCommand(selectedProcess, 'restart')
                  }
                  onClick={() => void runAction('restart')}
                >
                  {isRestarting ? (
                    <Spinner className='size-4' />
                  ) : (
                    <RotateCcw strokeWidth={2} />
                  )}
                  Restart
                </Button>
              )}

              {canDelete && (
                <Button
                  type='button'
                  variant='destructive'
                  className={cn('w-full', !showReloadButton && 'col-span-2')}
                  disabled={!selectedProcess || isActionDisabled}
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash2 strokeWidth={2} />
                  Delete
                </Button>
              )}
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={canDelete && isDeleteOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setIsDeleteOpen(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className='text-destructive'>
              <Trash2 strokeWidth={2} />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete Process?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedProcess?.name ?? 'this process'}? It
              will be stopped and removed from PM2's registry. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant='destructive'
              disabled={isDeleting}
              onClick={() => void confirmDelete()}
            >
              {isDeleting && <Spinner className='size-4' />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}