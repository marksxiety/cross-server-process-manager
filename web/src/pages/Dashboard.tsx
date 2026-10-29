import { useEffect, useMemo } from 'react'
import { Link } from 'react-router'
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
import { ErrorAlert } from '@/components/custom/error-alert'
import { PageLoader } from '@/components/custom/page-loader'
import { ProcessesSection } from '@/components/custom/processes-section'
import { ServerHeader } from '@/components/custom/server-header'
import { useAccess } from '@/hooks/use-access'
import { DASHBOARD_AUTO_REFRESH_MS } from '@/lib/swr'
import { cn } from '@/lib/utils'
import { useDashboardStore, useProcessesStatus } from '@/stores/dashboard.store'

export function Dashboard() {
  const servers = useDashboardStore((state) => state.servers)
  const serversStatus = useDashboardStore((state) => state.serversStatus)
  const registryRequestError = useDashboardStore((state) => state.requestError)
  const processesByServer = useDashboardStore((state) => state.processesByServer)
  const isRefreshing = useDashboardStore((state) => state.isRefreshing)
  const load = useDashboardStore((state) => state.load)
  const refresh = useDashboardStore((state) => state.refresh)
  const reload = useDashboardStore((state) => state.reload)
  const processesStatus = useProcessesStatus()
  const access = useAccess()

  // Flat, cross-server view of every process. Servers that are still loading or
  // unreachable are surfaced on their own tile instead.
  const allProcessItems = useMemo(
    () =>
      servers.flatMap((server) => {
        const entry = processesByServer[server.server]
        if (entry?.status !== 'success') return []
        return entry.processes.map((process) => ({ server, process }))
      }),
    [servers, processesByServer],
  )

  // Servers whose agent could not be reached. Their processes are unknown, so
  // the area reports the failure instead of claiming there are none.
  const unreachableServerNames = useMemo(
    () =>
      servers
        .filter((server) => processesByServer[server.server]?.status === 'error')
        .map((server) => server.server),
    [servers, processesByServer],
  )

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

  const processEmptyState =
    processesStatus === 'error' ? (
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
    )

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

          <ProcessesSection
            className='mt-6'
            items={allProcessItems}
            processesByServer={processesByServer}
            isLoading={processesStatus === 'loading' || processesStatus === 'idle'}
            isError={processesStatus === 'error'}
            empty={processEmptyState}
            loadingDescription='Fetching processes from the registered servers…'
          />
        </>
      )}
    </div>
  )
}
