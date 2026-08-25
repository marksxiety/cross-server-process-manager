import { Tile } from '@/components/custom/Tile'
import { DashboardAlerts } from '@/components/custom/DashboardAlert'
import { TileContainer } from '@/components/custom/TileContainer'
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
import { fetchRegisteredProcesses } from '@/api/services/process'
import { useState, useEffect } from 'react'

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
          <DrawerHeader>
            <DrawerTitle>
              {tileInfo?.namespace} · {tileInfo?.name}
            </DrawerTitle>
            <DrawerDescription>{tileInfo?.ip_address}</DrawerDescription>
          </DrawerHeader>
          <div className='space-y-4 p-4'>
            {tileInfo && (
              <dl className='grid grid-cols-2 gap-x-4 gap-y-3'>
                {(
                  [
                    ['PID', tileInfo.pid],
                    ['PM ID', tileInfo.pm_id],
                    ['Name', tileInfo.name],
                    ['Namespace', tileInfo.namespace],
                    ['Status', tileInfo.status],
                    ['Uptime', tileInfo.uptime],
                    ['Restarts', tileInfo.restarts],
                    ['Unstable Restarts', tileInfo.unstable_restarts],
                    ['Exec Mode', tileInfo.exec_mode],
                    ['Instances', tileInfo.instances],
                    ['Interpreter', tileInfo.interpreter],
                    ['CPU', `${tileInfo.cpu}%`],
                    ['Memory', tileInfo.memory],
                    ['CWD', tileInfo.cwd],
                    ['Watch', tileInfo.watch.toString()],
                    ['Autorestart', tileInfo.autorestart.toString()],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt>
                      <Label>{label}</Label>
                    </dt>
                    <dd className='mt-1 wrap-break-words text-sm text-muted-foreground'>
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <DrawerFooter>
            <Separator />
            <div className='grid grid-cols-2 gap-2'>
              <Button>
                <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
                Restart
              </Button>
              <Button variant='secondary'>
                <HugeiconsIcon icon={Refresh04Icon} strokeWidth={2} />
                Reload
              </Button>
              <Button variant='outline'>
                <HugeiconsIcon icon={PowerOffIcon} strokeWidth={2} />
                Stop
              </Button>

              <Button variant='destructive'>
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                Delete
              </Button>
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
