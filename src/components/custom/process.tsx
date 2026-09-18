import { Play, RotateCcw, Square, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { StatusDot } from '@/components/custom/status-dot'
import {
  processTone,
  toneSurfaceClasses,
  toneTextClasses,
} from '@/lib/status-tone'
import { cn } from '@/lib/utils'
import type { ProcessSummary } from '@/types/process'

function formatMemory(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

type ProcessProps = {
  process: ProcessSummary
  onRestart: () => void
  onStop: () => void
  onDelete: () => void
}

export function Process({
  process,
  onRestart,
  onStop,
  onDelete,
}: ProcessProps) {
  const tone = processTone(process.status)

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
        {process.status === 'online' &&
          ` · ${process.cpu}% · ${formatMemory(process.memory)}`}
        {process.status === 'errored' && ` · ${process.restarts} restarts`}
      </span>

      <div className='flex items-center gap-0.5'>
        {process.status === 'stopped' && (
          <Button
            variant='ghost'
            size='icon-sm'
            onClick={onRestart}
            aria-label='Start'
          >
            <Play strokeWidth={2} className='size-3.5' />
          </Button>
        )}
        {(process.status === 'online' || process.status === 'errored') && (
          <Button
            variant='ghost'
            size='icon-sm'
            onClick={onRestart}
            aria-label='Restart'
          >
            <RotateCcw strokeWidth={2} className='size-3.5' />
          </Button>
        )}
        {process.status === 'online' && (
          <Button
            variant='ghost'
            size='icon-sm'
            onClick={onStop}
            aria-label='Stop'
          >
            <Square strokeWidth={2} className='size-3.5' />
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
          <Trash2 strokeWidth={2} className='size-3.5' />
        </Button>
      </div>
    </div>
  )
}
