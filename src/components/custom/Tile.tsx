import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { HugeiconsIcon } from '@hugeicons/react'
import { CpuIcon, RamMemoryIcon } from '@hugeicons/core-free-icons'
import type { ProcessInfo } from '@/types'
import { StatusBadge } from '@/components/custom/StatusBadge'

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

interface TileProps {
  process: ProcessInfo
  onClick: (process: ProcessInfo) => void
}

export function Tile({ process, onClick }: TileProps) {
  const isErrored = process.status.toLowerCase() === 'errored'
  const isStopped = process.status.toLowerCase() === 'stopped'

  return (
    <Card
      onClick={() => onClick(process)}
      className={cn(
        'flex min-h-40 flex-col overflow-hidden py-0 gap-0 cursor-pointer select-none',
        'transition-all duration-150 ease-out hover:-translate-y-1 hover:shadow-md hover:border-muted-foreground/30',
        isErrored && 'border-destructive/50',
        isStopped && 'border-slate-300 dark:border-slate-800 opacity-80',
      )}
    >
      <div className={cn('h-0.75 w-full shrink-0', getAccentClass(process.status))} />

      <CardHeader className='pt-4 pb-2'>
        <div className='flex items-start justify-between gap-2'>
          <span className='text-sm font-medium leading-snug line-clamp-2 break-all'>
            {process.name}
          </span>
          <StatusBadge status={process.status} />
        </div>
        <p className='text-xs text-muted-foreground leading-relaxed truncate pt-0.5'>
          {process.namespace} · {process.ip_address}
        </p>
      </CardHeader>

      <CardContent className='mt-auto flex flex-col justify-end pb-4 pt-0'>
        <div className='flex items-center justify-between border-t pt-3 text-xs'>
          <div className='flex items-center gap-1.5'>
            <HugeiconsIcon
              icon={CpuIcon}
              size={14}
              className='text-muted-foreground shrink-0'
            />
            <span className='text-muted-foreground'>CPU</span>
            <span className='font-medium text-foreground'>{process.cpu}%</span>
          </div>
          <div className='flex items-center gap-1.5'>
            <HugeiconsIcon
              icon={RamMemoryIcon}
              size={14}
              className='text-muted-foreground shrink-0'
            />
            <span className='text-muted-foreground'>MEM</span>
            <span className='font-medium text-foreground'>
              {process.memory}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}