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
import { StatusBadge } from '@/components/custom/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { fetchRegisteredProcesses } from '@/api/services/process'
import { ProcessLogs } from '@/components/custom/ProcessLogs'
import { useState, useEffect } from 'react'
import type { RegisterProcessForm } from '@/types'

const REGISTER_FORM_DEFAULT: RegisterProcessForm = {
  name: '',
  namespace: '',
  script: '',
  cwd: '',
  instances: '',
  interpreter: '',
  watch: false,
  autorestart: true,
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

  // Register Process drawer form state
  const [showRegisterDrawer, setShowRegisterDrawer] = useState(false)
  const [registerForm, setRegisterForm] = useState<RegisterProcessForm>(
    REGISTER_FORM_DEFAULT,
  )

  const updateRegisterField = <K extends keyof RegisterProcessForm>(
    key: K,
    value: RegisterProcessForm[K],
  ) => {
    setRegisterForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleRegisterSubmit = () => {
    console.log('register process', registerForm)
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

  const logServerUrl =
    serverList.find(
      (s) =>
        s.url !== 'none' &&
        new URL(s.url).hostname === tileInfo?.ip_address,
    )?.url ?? (selectedServer.url !== 'none' ? selectedServer.url : undefined)

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
                <ProcessLogs serverUrl={logServerUrl} processId={tileInfo.pm_id} />
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
        <div className='flex items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <h1 className='text-2xl font-semibold tracking-tight'>Services</h1>
            {isLoading && <Spinner />}
          </div>
          <div className='flex items-center gap-3'>
            {/* ===================== REGISTER PROCESS DRAWER ===================== */}
            <Drawer
              swipeDirection='right'
              open={showRegisterDrawer}
              onOpenChange={(open) => {
                setShowRegisterDrawer(open)
                if (!open) setRegisterForm(REGISTER_FORM_DEFAULT)
              }}
            >
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

                <ScrollArea className='flex-1'>
                  <div className='space-y-4 p-4'>
                    <div className='space-y-1.5'>
                      <Label htmlFor='reg-name'>Name</Label>
                      <Input
                        id='reg-name'
                        placeholder='client'
                        value={registerForm.name}
                        onChange={(e) =>
                          updateRegisterField('name', e.target.value)
                        }
                      />
                    </div>

                    <div className='space-y-1.5'>
                      <Label htmlFor='reg-namespace'>Namespace</Label>
                      <Input
                        id='reg-namespace'
                        placeholder='DPR'
                        value={registerForm.namespace}
                        onChange={(e) =>
                          updateRegisterField('namespace', e.target.value)
                        }
                      />
                    </div>

                    <div className='space-y-1.5'>
                      <Label htmlFor='reg-script'>Script path</Label>
                      <Input
                        id='reg-script'
                        placeholder='index.js'
                        value={registerForm.script}
                        onChange={(e) =>
                          updateRegisterField('script', e.target.value)
                        }
                      />
                    </div>

                    <div className='space-y-1.5'>
                      <Label htmlFor='reg-cwd'>Working directory</Label>
                      <Input
                        id='reg-cwd'
                        placeholder='C:\Users\...\client'
                        value={registerForm.cwd}
                        onChange={(e) =>
                          updateRegisterField('cwd', e.target.value)
                        }
                      />
                    </div>

                    <div className='grid grid-cols-2 gap-3'>
                      <div className='space-y-1.5'>
                        <Label htmlFor='reg-instances'>Instances</Label>
                        <Input
                          id='reg-instances'
                          placeholder='1'
                          value={registerForm.instances}
                          onChange={(e) =>
                            updateRegisterField('instances', e.target.value)
                          }
                        />
                      </div>
                      <div className='space-y-1.5'>
                        <Label htmlFor='reg-interpreter'>Interpreter</Label>
                        <Input
                          id='reg-interpreter'
                          placeholder='node'
                          value={registerForm.interpreter}
                          onChange={(e) =>
                            updateRegisterField('interpreter', e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className='flex items-center justify-between py-1'>
                      <Label htmlFor='reg-watch' className='font-normal'>
                        Watch for changes
                      </Label>
                      <Switch
                        id='reg-watch'
                        checked={registerForm.watch}
                        onCheckedChange={(checked) =>
                          updateRegisterField('watch', checked)
                        }
                      />
                    </div>
                    <div className='flex items-center justify-between py-1'>
                      <Label htmlFor='reg-autorestart' className='font-normal'>
                        Autorestart
                      </Label>
                      <Switch
                        id='reg-autorestart'
                        checked={registerForm.autorestart}
                        onCheckedChange={(checked) =>
                          updateRegisterField('autorestart', checked)
                        }
                      />
                    </div>
                  </div>
                </ScrollArea>

                <DrawerFooter>
                  <Button onClick={handleRegisterSubmit}>Submit</Button>
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
