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
import { useState } from 'react'

type DashboardServer = ServerInfo & {
  url: string
  data: ProcessInfo[]
  isLoading: boolean
  error?: string
}

const MOCK_SERVERS: DashboardServer[] = [
  {
    id: '192.168.36.212',
    name: 'SERVER01',
    ip_address: '192.168.36.212',
    url: 'http://192.168.36.212:4000',
    data: [
      {
        pid: 8123,
        pm_id: 0,
        name: 'api-gateway',
        namespace: 'backend',
        status: 'online',
        uptime: 482100,
        restarts: 2,
        unstable_restarts: 0,
        exec_mode: 'cluster',
        instances: 4,
        interpreter: 'node',
        cpu: 12.4,
        ip_address: '192.168.36.212',
        memory: 184467440,
        cwd: '/opt/apps/api-gateway',
        watch: false,
        autorestart: true,
      },
      {
        pid: 9241,
        pm_id: 1,
        name: 'worker-queue',
        namespace: 'backend',
        status: 'online',
        uptime: 482100,
        restarts: 5,
        unstable_restarts: 1,
        exec_mode: 'fork',
        instances: 1,
        interpreter: 'node',
        cpu: 3.1,
        ip_address: '192.168.36.212',
        memory: 76309760,
        cwd: '/opt/apps/worker-queue',
        watch: false,
        autorestart: true,
      },
    ],
    isLoading: false,
  },
  {
    id: '192.168.1.2',
    name: 'SERVER02',
    ip_address: '192.168.1.2',
    url: 'http://192.168.1.2:4000',
    data: [
      {
        pid: 0,
        pm_id: 0,
        name: 'legacy-cron',
        namespace: 'jobs',
        status: 'stopped',
        uptime: 0,
        restarts: 12,
        unstable_restarts: 6,
        exec_mode: 'fork',
        instances: 1,
        interpreter: 'python3',
        cpu: 0,
        ip_address: '192.168.1.2',
        memory: 0,
        cwd: '/opt/jobs/legacy-cron',
        watch: false,
        autorestart: false,
      },
    ],
    isLoading: false,
  },
  {
    id: '192.168.1.3',
    name: 'SERVER03',
    ip_address: '192.168.1.3',
    url: 'http://192.168.1.3:4000',
    data: [
      {
        pid: 3301,
        pm_id: 0,
        name: 'report-generator',
        namespace: 'reports',
        status: 'errored',
        uptime: 10400,
        restarts: 22,
        unstable_restarts: 18,
        exec_mode: 'fork',
        instances: 1,
        interpreter: 'node',
        cpu: 0.2,
        ip_address: '192.168.1.3',
        memory: 41943040,
        cwd: '/opt/apps/report-generator',
        watch: true,
        autorestart: true,
      },
    ],
    isLoading: false,
  },
]

export function Dashboard() {
  const [showTileDrawer, setShowTileDrawer] = useState(false)
  const [tileInfo, setTileInfo] = useState<ProcessInfo | null>(null)

  const [serverList] = useState<DashboardServer[]>(MOCK_SERVERS)

  const handleTileClick = (process: ProcessInfo) => {
    setShowTileDrawer(true)
    setTileInfo(process)
  }

  const isLoading = false

  const allProcesses = serverList
    .flatMap((s) => s.data ?? [])
    .sort((a, b) => {
      const statusWeight = (status: string) => {
        const s = status.toLowerCase()
        if (s === 'errored') return 0
        if (s === 'waiting restart' || s === 'stopping') return 1
        if (s === 'online' || s === 'launching') return 2
        return 3 // stopped
      }
      return statusWeight(a.status) - statusWeight(b.status)
    })
  const serverErrors = Object.fromEntries(
    serverList.filter((s) => s.error).map((s) => [s.id, s.error as string]),
  )

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
        <div className='mx-auto max-w-[2000px] space-y-8 p-6 lg:p-8'>
          {/* Infrastructure Section */}
          <section>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold tracking-tight'>
                Infrastructure Health
              </h2>
              {!isLoading && (
                <span className='text-sm text-muted-foreground'>
                  {serverList.length} Nodes
                </span>
              )}
            </div>
            <ServerTileContainer
              servers={serverList}
              isLoading={isLoading}
              errors={serverErrors}
            />
          </section>

          <Separator className='opacity-50' />

          {/* Services Section */}
          <section>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold tracking-tight'>
                Active Services
              </h2>
              {!isLoading && (
                <span className='text-sm text-muted-foreground'>
                  {allProcesses.length} Processes
                </span>
              )}
            </div>
            <TileContainer isLoading={isLoading}>
              {allProcesses.map((process) => (
                <Tile
                  key={`${process.ip_address}-${process.pm_id}`}
                  process={process}
                  onClick={handleTileClick}
                />
              ))}
            </TileContainer>
          </section>
        </div>
      </ScrollArea>
    </>
  )
}
