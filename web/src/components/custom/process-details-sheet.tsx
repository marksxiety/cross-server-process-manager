import { useMemo, useState } from 'react'
import { Circle, Pause, Play, RotateCcw, RotateCw, Trash2 } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { ProcessDetails } from '@/components/custom/process-details'
import { useAccess } from '@/hooks/use-access'
import { useProcessDescribe } from '@/hooks/use-process-describe'
import { errorCodeLabel, toApiError } from '@/lib/error-code'
import { canRunProcessCommand } from '@/lib/process-runtime'
import { processItemKey } from '@/lib/sort-processes'
import { getStatusContext, getStatusVisual } from '@/lib/status-styles'
import { cn } from '@/lib/utils'
import { useDashboardStore } from '@/stores/dashboard.store'
import { logKey, useProcessLogsStore } from '@/stores/process-logs.store'
import type { ApiError } from '@/types/api'
import type { ProcessCommand, ProcessSummary } from '@/types/process'
import type { RegisteredServer } from '@/types/server'

export type ProcessSelection = {
  server: RegisteredServer
  process: ProcessSummary
}

export type ProcessDetailsSheetProps = {
  selection: ProcessSelection | null
  onClose: () => void
}

const COMMAND_LABELS: Record<
  ProcessCommand,
  { loading: string; success: string }
> = {
  start: { loading: 'Starting process…', success: 'Process started' },
  stop: { loading: 'Pausing process…', success: 'Process paused' },
  restart: { loading: 'Restarting process…', success: 'Process restarted' },
  reload: { loading: 'Reloading process…', success: 'Process reloaded' },
  delete: { loading: 'Deleting process…', success: 'Process deleted' },
}

export function ProcessDetailsSheet({
  selection,
  onClose,
}: ProcessDetailsSheetProps) {
  const processesByServer = useDashboardStore((state) => state.processesByServer)
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
  const access = useAccess()

  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const describe = useProcessDescribe(
    selection?.server ?? null,
    selection?.process.pm_id ?? null,
  )

  const logs = useProcessLogsStore((state) =>
    selection
      ? state.entries[logKey(selection.server, selection.process.pm_id)]
      : undefined,
  )

  // The sheet's live view of the selected process: prefer the freshest cached
  // summary, falling back to the snapshot it was opened with.
  const selectedProcess = useMemo(() => {
    if (!selection) return null
    const entry = processesByServer[selection.server.server]
    const current = entry?.processes.find(
      (item) => item.pm_id === selection.process.pm_id,
    )
    return current ?? selection.process
  }, [selection, processesByServer])

  const selectedServerEntry = useMemo(
    () =>
      selection ? processesByServer[selection.server.server] : undefined,
    [selection, processesByServer],
  )

  const selectedVisual = getStatusVisual(selectedProcess)
  const selectedContext = selectedProcess
    ? getStatusContext(selectedProcess)
    : null
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
  const hasProcessActions =
    canStart || canStop || canRestart || canReload || canDelete

  const runAction = async (command: Exclude<ProcessCommand, 'delete'>) => {
    if (!selection || !selectedProcess) return

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
    const request = commands[command](selection.server, selectedProcess).then(
      (result) => {
        if (!result.success) throw toApiError(result)
        return result
      },
    )

    try {
      await toast.promise(request, {
        loading: { title: COMMAND_LABELS[command].loading },
        success: {
          title: COMMAND_LABELS[command].success,
          description: `${selectedProcess.name} on ${selection.server.server}.`,
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
    if (!selection || !selectedProcess || !access.canDo('process.delete')) return

    const request = deleteProcess(selection.server, selectedProcess).then(
      (result) => {
        if (!result.success) throw toApiError(result)
        return result
      },
    )

    try {
      await toast.promise(request, {
        loading: { title: COMMAND_LABELS.delete.loading },
        success: {
          title: COMMAND_LABELS.delete.success,
          description: `${selectedProcess.name} was removed from ${selection.server.server}.`,
        },
        error: (error: ApiError) => ({
          title: errorCodeLabel(error.code),
          description: error.message,
        }),
      })
      setIsDeleteOpen(false)
      onClose()
    } catch {
      // toast.promise already surfaced the error; keep the dialog open.
    }
  }

  return (
    <>
      <Sheet
        open={access.isAuthenticated && selection !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleteOpen(false)
            onClose()
          }
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
            {selection && selectedProcess && (
              <ProcessDetails
                key={processItemKey(selection)}
                server={selection.server}
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
        open={selection !== null && canDelete && isDeleteOpen}
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
    </>
  )
}
