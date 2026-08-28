import { Tile } from '@/components/custom/Tile'
import { TileContainer } from '@/components/custom/TileContainer'
import { ServerTileContainer } from '@/components/custom/ServerTileContainer'
import { ConfirmDialog } from '@/components/custom/ConfirmDialog'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Refresh01Icon,
  Refresh04Icon,
  PowerOffIcon,
  Delete02Icon,
} from '@hugeicons/core-free-icons'
import type { ProcessInfo, ServerInfo } from '@/types'
import servers from '@/data/servers.json'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/custom/StatusBadge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { fetchRegisteredProcesses } from '@/api/services/process'
import { ProcessLogs } from '@/components/custom/ProcessLogs'
import { useState, useEffect } from 'react'

type DashboardServer = ServerInfo & {
  url: string
  data: ProcessInfo[]
  isLoading: boolean
  error?: string
}

function getHostname(url: string) {
  return new URL(url).hostname
}

function buildInitialServerList(): DashboardServer[] {
  return servers.map((server) => {
    const ip_address = getHostname(server.url)
    return {
      id: ip_address,
      name: server.server,
      ip_address,
      url: server.url,
      data: [],
      isLoading: true,
    }
  })
}

export function Dashboard() {
  const [showTileDrawer, setShowTileDrawer] = useState(false)
  const [tileInfo, setTileInfo] = useState<ProcessInfo | null>(null)

  const [serverList, setServerList] = useState<DashboardServer[]>(buildInitialServerList)

  const handleTileClick = (process: ProcessInfo) => {
    setShowTileDrawer(true)
    setTileInfo(process)
  }

  useEffect(() => {
    let cancelled = false

    for (const server of servers) {
      const ip_address = getHostname(server.url)

      fetchRegisteredProcesses(server.url)
        .then((res) => {
          if (cancelled) return
          setServerList((prev) =>
            prev.map((s) =>
              s.id === ip_address
                ? {
                    ...s,
                    host: res.success ? (res.info?.overview ?? undefined) : s.host,
                    status: res.success ? 'online' : 'offline',
                    data: res.success ? (res.info?.processes ?? []) : [],
                    isLoading: false,
                    error: res.success
                      ? undefined
                      : res.message || `No data from ${server.url}`,
                  }
                : s,
            ),
          )
        })
        .catch((err) => {
          if (cancelled) return
          setServerList((prev) =>
            prev.map((s) =>
              s.id === ip_address
                ? {
                    ...s,
                    host: undefined,
                    status: 'offline',
                    data: [],
                    isLoading: false,
                    error: (err as Error).message,
                  }
                : s,
            ),
          )
        })
    }

    return () => {
      cancelled = true
    }
  }, [])

  const isLoading = serverList.some((s) => s.isLoading)
  const allProcesses = serverList.flatMap((s) => s.data ?? [])
  const serverErrors = Object.fromEntries(
    serverList.filter((s) => s.error).map((s) => [s.id, s.error as string]),
  )

  const logServerUrl = serverList.find((s) => s.ip_address === tileInfo?.ip_address)?.url

  return (
    <>
      {/* ===================== VIEW PROCESS DRAWER ===================== */}
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
              {tileInfo && <StatusBadge status={tileInfo.status} />}
            </div>
          </DrawerHeader>

          <Tabs
            defaultValue='overview'
            className='flex flex-1 flex-col overflow-hidden'
          >
            <TabsList className='mx-4 mt-3 w-auto'>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='logs'>Logs</TabsTrigger>
            </TabsList>

            <TabsContent value='overview' className='flex-1 overflow-hidden'>
              <ScrollArea className='h-full'>
                {tileInfo && (
                  <div className='space-y-4 p-4'>
                    <div className='grid grid-cols-2 gap-3'>
                      <div className='rounded-lg bg-secondary p-3'>
                        <p className='mb-0.5 text-xs text-muted-foreground'>
                          CPU
                        </p>
                        <p className='text-xl font-semibold'>{tileInfo.cpu}%</p>
                      </div>
                      <div className='rounded-lg bg-secondary p-3'>
                        <p className='mb-0.5 text-xs text-muted-foreground'>
                          Memory
                        </p>
                        <p className='text-xl font-semibold'>
                          {tileInfo.memory}
                        </p>
                      </div>
                    </div>

                    <table className='w-full text-sm'>
                      <tbody className='divide-y divide-border'>
                        <tr>
                          <td className='py-1.5 text-muted-foreground'>PID</td>
                          <td className='py-1.5 text-right'>{tileInfo.pid}</td>
                        </tr>
                        <tr>
                          <td className='py-1.5 text-muted-foreground'>
                            PM ID
                          </td>
                          <td className='py-1.5 text-right'>
                            {tileInfo.pm_id}
                          </td>
                        </tr>
                        <tr>
                          <td className='py-1.5 text-muted-foreground'>
                            Uptime
                          </td>
                          <td className='py-1.5 text-right'>
                            {tileInfo.uptime}
                          </td>
                        </tr>
                        <tr>
                          <td className='py-1.5 text-muted-foreground'>
                            Restarts
                          </td>
                          <td className='py-1.5 text-right'>
                            {tileInfo.restarts}
                          </td>
                        </tr>
                        <tr>
                          <td className='py-1.5 text-muted-foreground'>
                            Unstable restarts
                          </td>
                          <td className='py-1.5 text-right'>
                            {tileInfo.unstable_restarts}
                          </td>
                        </tr>
                        <tr>
                          <td className='py-1.5 text-muted-foreground'>
                            Exec mode
                          </td>
                          <td className='py-1.5 text-right'>
                            {tileInfo.exec_mode}
                          </td>
                        </tr>
                        <tr>
                          <td className='py-1.5 text-muted-foreground'>
                            Instances
                          </td>
                          <td className='py-1.5 text-right'>
                            {tileInfo.instances ?? '-'}
                          </td>
                        </tr>
                        <tr>
                          <td className='py-1.5 text-muted-foreground'>
                            Interpreter
                          </td>
                          <td className='break-all py-1.5 text-right text-xs'>
                            {tileInfo.interpreter}
                          </td>
                        </tr>
                        <tr>
                          <td className='py-1.5 text-muted-foreground'>
                            Watch
                          </td>
                          <td className='py-1.5 text-right'>
                            {tileInfo.watch ? 'on' : 'off'}
                          </td>
                        </tr>
                        <tr>
                          <td className='py-1.5 text-muted-foreground'>
                            Autorestart
                          </td>
                          <td className='py-1.5 text-right'>
                            {tileInfo.autorestart ? 'on' : 'off'}
                          </td>
                        </tr>
                        <tr>
                          <td className='py-1.5 text-muted-foreground'>cwd</td>
                          <td className='break-all py-1.5 text-right text-xs'>
                            {tileInfo.cwd}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Logs tail view */}
            <TabsContent value='logs' className='flex-1 overflow-hidden'>
              {tileInfo && logServerUrl && (
                <ProcessLogs
                  serverUrl={logServerUrl}
                  processId={tileInfo.pm_id}
                />
              )}
            </TabsContent>
          </Tabs>

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

      <ScrollArea className='h-full'>
        <div className='space-y-4 p-4'>
          <ServerTileContainer
            servers={serverList}
            isLoading={isLoading}
            errors={serverErrors}
          />
          <Separator />
          <TileContainer isLoading={isLoading}>
            {allProcesses.map((process) => (
              <Tile
                key={`${process.ip_address}-${process.pm_id}`}
                process={process}
                onClick={handleTileClick}
              />
            ))}
          </TileContainer>
        </div>
      </ScrollArea>
    </>
  )
}
