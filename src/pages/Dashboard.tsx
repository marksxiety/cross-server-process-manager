import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { RefreshCw, ServerOff } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Process } from '@/components/custom/process'
import { ServerHeader } from '@/components/custom/server-header'
import { serverTone, toneSurfaceClasses } from '@/lib/status-tone'
import { DASHBOARD_AUTO_REFRESH_MS } from '@/lib/swr'
import { cn } from '@/lib/utils'
import { useDashboardStore } from '@/stores/dashboard.store'

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

  const handleRestart = (pmId: number) => console.log('restart', pmId) // TODO: wire to store action
  const handleStop = (pmId: number) => console.log('stop', pmId) // TODO: wire to store action
  const handleDelete = (pmId: number) => console.log('delete', pmId) // TODO: wire to store action + confirm dialog

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
                              onRestart={() => handleRestart(process.pm_id)}
                              onStop={() => handleStop(process.pm_id)}
                              onDelete={() => handleDelete(process.pm_id)}
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
    </ScrollArea>
  )
}
