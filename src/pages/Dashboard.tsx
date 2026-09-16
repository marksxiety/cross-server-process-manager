import { useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useDashboardStore } from '@/stores/dashboard.store'
import type { ServerProcesses } from '@/stores/dashboard.store'

function describeProcesses(entry: ServerProcesses | undefined): string {
  if (!entry || entry.status === 'loading') return 'Loading…'
  if (entry.status === 'error') return entry.error ?? 'Failed to load processes'
  return `${entry.processes.length} processes`
}

export function Dashboard() {
  const serversStatus = useDashboardStore((state) => state.serversStatus)
  const servers = useDashboardStore((state) => state.servers)
  const serversError = useDashboardStore((state) => state.serversError)
  const processesByServer = useDashboardStore((state) => state.processesByServer)
  const load = useDashboardStore((state) => state.load)

  useEffect(() => {
    void load()
  }, [load])

  return (
    <ScrollArea className='h-full'>
      <div className='p-4'>
        <h1 className='text-2xl font-semibold tracking-tight'>Dashboard</h1>
        {serversStatus === 'loading' && (
          <p className='mt-4 text-sm text-muted-foreground'>Loading servers…</p>
        )}
        {serversStatus === 'error' && (
          <p className='mt-4 text-sm text-destructive'>{serversError}</p>
        )}
        <ul className='mt-4 space-y-2'>
          {servers.map((server) => (
            <li
              key={server.server}
              className='flex items-center justify-between rounded-md border p-3'
            >
              <span className='font-medium'>{server.server}</span>
              <span className='text-sm text-muted-foreground'>
                {describeProcesses(processesByServer[server.server])}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ScrollArea>
  )
}
