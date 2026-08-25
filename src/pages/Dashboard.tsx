import { Tile } from '@/components/custom/Tile'
import { DashboardAlerts } from '@/components/custom/DashboardAlert'
import { TileContainer } from '@/components/custom/TileContainer'
import { ConfirmDialog } from '@/components/custom/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  PlusSignIcon,
  Refresh01Icon,
  Refresh04Icon,
  PowerOffIcon,
  Delete02Icon,
} from '@hugeicons/core-free-icons'
import type { ProcessInfo, Server, ServerAlert } from '@/types'
import servers from '@/data/servers.json'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { fetchRegisteredProcesses } from '@/api/services/process'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  online:
    'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
  stopping:
    'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  launching:
    'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  stopped: 'bg-destructive/15 text-destructive border-destructive/30',
  errored: 'bg-destructive/15 text-destructive border-destructive/30',
  'one-launch-status': 'bg-muted text-muted-foreground border-border',
}

function getBadgeClass(status: string) {
  return STATUS_BADGE[status] ?? STATUS_BADGE['one-launch-status']
}

function Field({
  label,
  value,
}: {
  label: string
  value: string | number | undefined | null
}) {
  const hasValue =
    value !== undefined && value !== null && String(value).trim() !== ''
  return (
    <div>
      <dt>
        <Label className='text-xs text-muted-foreground'>{label}</Label>
      </dt>
      <dd className='mt-1 text-sm wrap-break-words'>
        {hasValue ? value : '-'}
      </dd>
    </div>
  )
}

export function Dashboard() {
  const [showTileDrawer, setShowTileDrawer] = useState(false)
  const [tileInfo, setTileInfo] = useState<ProcessInfo | null>(null)

  const allServer: Server = {
    server: 'All Server(s)',
    url: 'none',
  }

  const [serverList, setServerList] = useState<Server[]>(() =>
    servers.length > 0 ? [allServer, ...servers] : [],
  )
  const [isLoading, setIsLoading] = useState(() => servers.length > 0)
  const [alerts, setAlerts] = useState<ServerAlert[]>([])

  const handleTileClick = (process: ProcessInfo) => {
    setShowTileDrawer(true)
    setTileInfo(process)
  }

  const [selectedServer, setSelectedServer] = useState<Server>(allServer)

  const handleServerClick = (server: Server) => {
    setSelectedServer(server)
  }

  useEffect(() => {
    let cancelled = false
    for (const server of servers) {
      fetchRegisteredProcesses(server.url)
        .then((res) => {
          if (cancelled) return
          if (res.success) {
            setServerList((prev) =>
              prev.map((s) =>
                s.url === server.url ? { ...s, data: res.info ?? [] } : s,
              ),
            )
          } else {
            setAlerts((prev) => [
              ...prev,
              {
                type: 'alert',
                title: 'Fetch failed',
                description: res.message || `No data from ${server.url}`,
              },
            ])
          }
        })
        .catch((err) => {
          if (cancelled) return
          setAlerts((prev) => [
            ...prev,
            {
              type: 'alert',
              title: 'Network error',
              description: `${server.url}: ${(err as Error).message}`,
            },
          ])
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false)
        })
    }
    return () => {
      cancelled = true
    }
  }, [])

  const allProcesses = serverList.flatMap((s) => s.data ?? [])
  const visibleProcesses =
    selectedServer.url === allServer.url
      ? allProcesses
      : allProcesses.filter(
          (p) =>
            p.ip_address ===
            (selectedServer.url === 'none'
              ? ''
              : new URL(selectedServer.url).hostname),
        )

  return (
    <>
      <Drawer
        swipeDirection='right'
        open={showTileDrawer}
        onOpenChange={setShowTileDrawer}
      >
        <DrawerContent>
          <DrawerHeader className='border-b pb-4'>
            <div className='flex items-start justify-between gap-2'>
              <div>
                <DrawerTitle>
                  {tileInfo?.namespace} · {tileInfo?.name}
                </DrawerTitle>
                <DrawerDescription>{tileInfo?.ip_address}</DrawerDescription>
              </div>
              {tileInfo && (
                <Badge
                  variant='outline'
                  className={cn(
                    'shrink-0 text-[10px] font-medium uppercase tracking-wide',
                    getBadgeClass(tileInfo.status),
                  )}
                >
                  {tileInfo.status}
                </Badge>
              )}
            </div>
          </DrawerHeader>

          <ScrollArea className='flex-1'>
            {tileInfo && (
              <div className='space-y-4 p-4'>
                <div>
                  <p className='mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                    Process
                  </p>
                  <dl className='grid grid-cols-2 gap-x-4 gap-y-3'>
                    <Field label='PID' value={tileInfo.pid} />
                    <Field label='PM ID' value={tileInfo.pm_id} />
                    <Field label='Exec mode' value={tileInfo.exec_mode} />
                    <Field label='Instances' value={tileInfo.instances} />
                    <Field label='Interpreter' value={tileInfo.interpreter} />
                    <Field label='Uptime' value={tileInfo.uptime} />
                  </dl>
                </div>

                <Separator />

                <div>
                  <p className='mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                    Performance
                  </p>
                  <dl className='grid grid-cols-2 gap-x-4 gap-y-3'>
                    <Field label='CPU' value={`${tileInfo.cpu}%`} />
                    <Field label='Memory' value={tileInfo.memory} />
                    <Field label='Restarts' value={tileInfo.restarts} />
                    <Field
                      label='Unstable restarts'
                      value={tileInfo.unstable_restarts}
                    />
                  </dl>
                </div>

                <Separator />

                <div>
                  <p className='mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                    Configuration
                  </p>
                  <div className='mb-3'>
                    <Field label='CWD' value={tileInfo.cwd} />
                  </div>
                  <div className='flex items-center justify-between py-1'>
                    <Label className='text-sm font-normal'>Watch</Label>
                    <span className='text-sm font-medium'>
                      {tileInfo.watch ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className='flex items-center justify-between py-1'>
                    <Label className='text-sm font-normal'>Autorestart</Label>
                    <span className='text-sm font-medium'>
                      {tileInfo.autorestart ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          <DrawerFooter>
            <Separator />
            <div className='grid grid-cols-2 gap-2'>
              <ConfirmDialog
                title='Restart process?'
                description='The process will be restarted. Continue?'
                mediaIcon={Refresh01Icon}
                dialogSize='sm'
                actionVariant='default'
                actionLabel='Continue'
                onContinue={() => console.log('restart')}
                trigger={
                  <>
                    <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
                    Restart
                  </>
                }
              />
              <ConfirmDialog
                title='Reload process?'
                description='The process will be reloaded. Continue?'
                mediaIcon={Refresh04Icon}
                dialogSize='sm'
                actionVariant='default'
                actionLabel='Continue'
                triggerVariant='secondary'
                onContinue={() => console.log('reload')}
                trigger={
                  <>
                    <HugeiconsIcon icon={Refresh04Icon} strokeWidth={2} />
                    Reload
                  </>
                }
              />
              <ConfirmDialog
                title='Stop process?'
                description='The process will be stopped. Continue?'
                mediaIcon={PowerOffIcon}
                dialogSize='sm'
                actionVariant='destructive'
                actionLabel='Continue'
                triggerVariant='outline'
                onContinue={() => console.log('stop')}
                trigger={
                  <>
                    <HugeiconsIcon icon={PowerOffIcon} strokeWidth={2} />
                    Stop
                  </>
                }
              />
              <ConfirmDialog
                title='Delete process?'
                description='The process will be removed. Continue?'
                mediaIcon={Delete02Icon}
                dialogSize='sm'
                actionVariant='destructive'
                actionLabel='Continue'
                triggerVariant='destructive'
                onContinue={() => console.log('delete')}
                trigger={
                  <>
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                    Delete
                  </>
                }
              />
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <div className='space-y-4'>
        <div className='flex items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <h1 className='text-2xl font-semibold tracking-tight'>Services</h1>
            {isLoading && <Spinner />}
          </div>
          <div className='flex items-center gap-3'>
            <Drawer swipeDirection='right'>
              <DrawerTrigger render={<Button size='sm' />} className='p-4'>
                <HugeiconsIcon
                  icon={PlusSignIcon}
                  strokeWidth={2}
                  className='size-4'
                />
                Add Process
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Register a Process</DrawerTitle>
                  <DrawerDescription>
                    Enter the details to register a new process to the manager.
                  </DrawerDescription>
                </DrawerHeader>
                <div className='p-4'>{/* Content here */}</div>
                <DrawerFooter>
                  <Button>Submit</Button>
                  <DrawerClose render={<Button variant='outline' />}>
                    Cancel
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
        <div className='flex items-center justify-between gap-4'>
          <div className='flex flex-row gap-3'>
            {serverList.map((server) => (
              <Badge
                className={`cursor-pointer ${server.url !== selectedServer.url ? 'hover:bg-secondary' : ''}`}
                key={server.server}
                variant={
                  server.url === selectedServer.url ? 'default' : 'outline'
                }
                onClick={() => handleServerClick(server)}
              >
                {server.server}
              </Badge>
            ))}
          </div>
          <Input
            placeholder='Search name, namespace, or server'
            className='w-[25%]'
          />
        </div>
        <DashboardAlerts alerts={alerts} />
        <TileContainer>
          {visibleProcesses.map((process) => (
            <Tile
              key={process.pid}
              process={process}
              onClick={handleTileClick}
            />
          ))}
        </TileContainer>
      </div>
    </>
  )
}
