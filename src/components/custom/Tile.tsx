import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ProcessInfo } from '@/types'
import { StatusBadge } from '@/components/custom/StatusBadge'
import { formatMemory } from '@/utils/memory'

const STATUS_ACCENT: Record<string, string> = {
  online: 'bg-emerald-500',
  launching: 'bg-blue-500',
  'waiting restart': 'bg-amber-500',
  stopping: 'bg-orange-500',
  stopped: 'bg-slate-400 dark:bg-slate-500',
  errored: 'bg-destructive',
  'one-launch-status': 'bg-indigo-500',
}

const DEFAULT_ACCENT = 'bg-muted-foreground/40'

function getAccentClass(status: string) {
  return STATUS_ACCENT[status.toLowerCase()] ?? DEFAULT_ACCENT
}

export interface TileProps {
  process: ProcessInfo
  onClick: (process: ProcessInfo) => void
}

export function Tile({ process, onClick }: TileProps) {
  const status = process.status.toLowerCase()
  const isErrored = status === 'errored'
  const isStopped = status === 'stopped'
  const isWarning = status === 'waiting restart' || status === 'stopping'

  return (
    <Card
      onClick={() => onClick(process)}
      className={cn(
        'flex min-h-40 flex-col overflow-hidden py-0 gap-0 cursor-pointer select-none',
        'transition-all duration-150 ease-out hover:-translate-y-1 hover:shadow-md hover:border-muted-foreground/30',
        isErrored && 'border-destructive/50',
        isStopped && 'border-slate-300 dark:border-slate-800 opacity-80',
        isWarning && 'border-amber-500/50',
      )}
    >
      <div className={cn('h-0.75 w-full shrink-0', getAccentClass(status))} />

      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 pt-4'>
        <CardTitle className='text-sm font-medium truncate pr-4'>
          {process.name}
        </CardTitle>
        <StatusBadge status={process.status} />
      </CardHeader>

      <CardContent className='mt-auto flex flex-col justify-end pt-0 pb-4'>
        <div className='text-xs text-muted-foreground font-mono mb-4 truncate'>
          {process.namespace} <span className='opacity-50'>·</span>{' '}
          {process.ip_address}
        </div>

        <div className='flex items-center justify-between border-t pt-3'>
          <div className='space-y-1'>
            <p className='text-2xl font-bold tracking-tight'>{process.cpu}%</p>
            <p className='text-[10px] font-medium uppercase text-muted-foreground'>
              CPU Usage
            </p>
          </div>
          <div className='space-y-1 text-right'>
            <p className='text-2xl font-bold tracking-tight'>
              {formatMemory(process.memory)}
            </p>
            <p className='text-[10px] font-medium uppercase text-muted-foreground'>
              Memory
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
