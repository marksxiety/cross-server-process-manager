import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { HugeiconsIcon } from '@hugeicons/react'
import { CpuIcon, RamMemoryIcon } from '@hugeicons/core-free-icons'
import type { ProcessInfo } from '@/types'

const STATUS_BADGE: Record<string, string> = {
  online:
    'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
  stopping:
    'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  launching:
    'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  stopped: 'bg-destructive/15 text-destructive border-destructive/30',
  errored: 'bg-destructive/15 text-destructive border-destructive/30',
  'one-launch-status': 'bg-muted text-muted-foreground border-border',
}

const STATUS_ACCENT: Record<string, string> = {
  online: 'bg-green-500',
  stopping: 'bg-yellow-500',
  launching: 'bg-blue-500',
  stopped: 'bg-destructive',
  errored: 'bg-destructive',
  'one-launch-status': 'bg-muted-foreground/40',
}

function getBadgeClass(status: string) {
  return STATUS_BADGE[status] ?? STATUS_BADGE['one-launch-status']
}

function getAccentClass(status: string) {
  return STATUS_ACCENT[status] ?? STATUS_ACCENT['one-launch-status']
}

interface TileProps {
  process: ProcessInfo
  onClick: (process: ProcessInfo) => void
}

export function Tile({ process, onClick }: TileProps) {
  const isStopped = process.status === 'stopped'

  return (
    <Card
      onClick={() => onClick(process)}
      className={cn(
        'flex h-full flex-col overflow-hidden py-0 gap-0 cursor-pointer',
        'transition-all duration-150 ease-out hover:-translate-y-1 hover:shadow-md hover:border-muted-foreground/30',
        isStopped && 'border-destructive/50',
      )}
    >
      <div className={cn('h-0.75 w-full', getAccentClass(process.status))} />

      <CardHeader className='pt-4'>
        <div className='flex items-start justify-between gap-2'>
          <span className='text-sm font-medium leading-snug wrap-break-word'>
            {process.name}
          </span>
          <Badge
            variant='outline'
            className={cn(
              'shrink-0 text-[10px] font-medium uppercase tracking-wide',
              getBadgeClass(process.status),
            )}
          >
            {process.status}
          </Badge>
        </div>
        <p className='text-xs text-muted-foreground leading-relaxed wrap-break-word'>
          {process.namespace} · {process.ip_address}
        </p>
      </CardHeader>

      <CardContent className='flex flex-1 flex-col justify-end pb-4'>
        <div className='flex items-center justify-between border-t pt-3 text-xs'>
          <div className='flex items-center gap-1.5'>
            <HugeiconsIcon
              icon={CpuIcon}
              size={14}
              className='text-muted-foreground'
            />
            <span className='text-muted-foreground'>CPU</span>
            <span className='font-medium text-foreground'>{process.cpu}%</span>
          </div>
          <div className='flex items-center gap-1.5'>
            <HugeiconsIcon
              icon={RamMemoryIcon}
              size={14}
              className='text-muted-foreground'
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
