import { useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Delete02Icon,
  PlayIcon,
  ReloadIcon,
  ServerStack01Icon,
  StopIcon,
} from '@hugeicons/core-free-icons'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { StatusDot } from '@/components/custom/status-dot'
import {
  percentTone,
  processTone,
  serverTone,
  toneBadgeVariant,
  toneIconClasses,
  toneProgressClasses,
  toneSurfaceClasses,
  toneTextClasses,
} from '@/lib/status-tone'
import type { Tone } from '@/types/tone'
import { cn } from '@/lib/utils'
import { useDashboardStore } from '@/stores/dashboard.store'
import type { ServerProcesses } from '@/types/dashboard'
import type { ProcessSummary } from '@/types/process'
import type { RegisteredServer } from '@/types/server'

function formatMemory(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function StatBar({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className='flex-1'>
      <div className='mb-0.5 flex justify-between text-xs uppercase tracking-wide text-muted-foreground'>
        <span>{label}</span>
        <span className={cn('font-semibold', toneTextClasses[tone])}>{value.toFixed(0)}%</span>
      </div>
      <Progress
        value={Math.min(value, 100)}
        className={cn('**:data-[slot=progress-track]:h-1.5', toneProgressClasses[tone])}
      />
    </div>
  )
}

function ProcessActions({
  status,
  onRestart,
  onStop,
  onDelete,
}: {
  status: ProcessSummary['status']
  onRestart: () => void
  onStop: () => void
  onDelete: () => void
}) {
  return (
    <div className='flex items-center gap-0.5'>
      {status === 'stopped' && (
        <Button variant='ghost' size='icon-sm' onClick={onRestart} aria-label='Start'>
          <HugeiconsIcon icon={PlayIcon} strokeWidth={2} className='size-3.5' />
        </Button>
      )}
      {(status === 'online' || status === 'errored') && (
        <Button variant='ghost' size='icon-sm' onClick={onRestart} aria-label='Restart'>
          <HugeiconsIcon icon={ReloadIcon} strokeWidth={2} className='size-3.5' />
        </Button>
      )}
      {status === 'online' && (
        <Button variant='ghost' size='icon-sm' onClick={onStop} aria-label='Stop'>
          <HugeiconsIcon icon={StopIcon} strokeWidth={2} className='size-3.5' />
        </Button>
      )}
      <Separator orientation='vertical' className='mx-1 h-3' />
      <Button
        variant='ghost'
        size='icon-sm'
        className='text-destructive hover:text-destructive'
        onClick={onDelete}
        aria-label='Delete'
      >
        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className='size-3.5' />
      </Button>
    </div>
  )
}

function ProcessRow({ process }: { process: ProcessSummary }) {
  const tone = processTone(process.status)

  const handleRestart = () => console.log('restart', process.pm_id) // TODO: wire to store action
  const handleStop = () => console.log('stop', process.pm_id) // TODO: wire to store action
  const handleDelete = () => console.log('delete', process.pm_id) // TODO: wire to store action + confirm dialog

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5',
        tone === 'danger' && toneSurfaceClasses.danger,
      )}
    >
      <StatusDot tone={tone} />
      <span
        className={cn(
          'w-28 truncate text-xs font-medium',
          tone === 'danger' && toneTextClasses.danger,
        )}
      >
        {process.name}
      </span>
      <span className='flex-1 truncate text-xs text-muted-foreground'>
        pm_id {process.pm_id} · {process.status}
        {process.status === 'online' && ` · ${process.cpu}% · ${formatMemory(process.memory)}`}
        {process.status === 'errored' && ` · ${process.restarts} restarts`}
      </span>
      <ProcessActions status={process.status} onRestart={handleRestart} onStop={handleStop} onDelete={handleDelete} />
    </div>
  )
}

function ServerHeader({ server, entry }: { server: RegisteredServer; entry: ServerProcesses | undefined }) {
  const tone = serverTone(entry)
  const processes = entry?.status === 'success' ? entry.processes : []
  const overview = entry?.status === 'success' ? entry.overview : null
  const loadPct = overview ? Math.min((overview.cpu.loadAvg[0] / overview.cpu.cores) * 100, 100) : null

  return (
    <div className='flex w-full items-center gap-3'>
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', toneIconClasses[tone])}>
        <HugeiconsIcon icon={ServerStack01Icon} strokeWidth={2} className='size-4.5' />
      </div>
      <div className='w-28 text-left'>
        <CardTitle>{server.server}</CardTitle>
        <CardDescription>
          {server.host}:{server.port}
        </CardDescription>
      </div>

      {overview && loadPct !== null ? (
        <>
          <StatBar label='Load' value={loadPct} tone={percentTone(loadPct)} />
          <StatBar label='Mem' value={overview.memory.percentUsed} tone={percentTone(overview.memory.percentUsed)} />
        </>
      ) : entry?.status === 'error' ? (
        <div className={cn('flex-1 text-xs font-medium', toneTextClasses.danger)}>
          {entry.error ?? 'Unreachable'}
        </div>
      ) : (
        <div className='flex-1 text-xs text-muted-foreground'>Loading…</div>
      )}

      <Badge variant={toneBadgeVariant[tone]} className='text-xs'>
        {entry?.status === 'success' ? `${processes.length} proc` : '—'}
      </Badge>
    </div>
  )
}

export function Dashboard() {
  const servers = useDashboardStore((state) => state.servers)
  const serversStatus = useDashboardStore((state) => state.serversStatus)
  const serversError = useDashboardStore((state) => state.serversError)
  const processesByServer = useDashboardStore((state) => state.processesByServer)
  const load = useDashboardStore((state) => state.load)

  const [openServers, setOpenServers] = useState<string[] | null>(null)

  const defaultOpen = useMemo(
    () => servers.filter((s) => serverTone(processesByServer[s.server]) !== 'success').map((s) => s.server),
    [servers, processesByServer],
  )

  const openList = openServers ?? defaultOpen

  const handleOpenChange = (serverName: string, isOpen: boolean) => {
    setOpenServers(isOpen ? [...openList, serverName] : openList.filter((name) => name !== serverName))
  }

  useEffect(() => {
    void load()
  }, [load])

  return (
    <ScrollArea className='h-full'>
      <div className='p-4'>
        <h1 className='text-2xl font-semibold tracking-tight'>Dashboard</h1>

        {serversStatus === 'loading' && <p className='mt-4 text-sm text-muted-foreground'>Loading servers…</p>}
        {serversStatus === 'error' && <p className='mt-4 text-sm text-destructive'>{serversError}</p>}

        {serversStatus === 'success' && (
          <div className='mt-4 space-y-2'>
            {servers.map((server) => {
              const entry = processesByServer[server.server]
              const canExpand = entry?.status === 'success' && entry.processes.length > 0

              return (
                <Card key={server.server}>
                  <Accordion
                    value={openList.includes(server.server) ? [server.server] : []}
                    onValueChange={(value) => handleOpenChange(server.server, value.includes(server.server))}
                    className='rounded-none border-0'
                  >
                    <AccordionItem value={server.server} className='border-0 data-open:bg-transparent'>
                      <AccordionTrigger className='px-(--card-spacing) py-2.5 hover:no-underline' disabled={!canExpand}>
                        <ServerHeader server={server} entry={entry} />
                      </AccordionTrigger>
                      {canExpand && (
                        <AccordionContent className='relative space-y-0.5 pb-2 pl-9'>
                          <Separator orientation='vertical' className='absolute left-4 top-0 bottom-2' />
                          {entry.processes.map((process) => (
                            <ProcessRow key={process.pm_id} process={process} />
                          ))}
                        </AccordionContent>
                      )}
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
