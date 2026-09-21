import { Badge } from '@/components/ui/badge'
import { StatusDot } from '@/components/custom/status-dot'
import {
  processTone,
  toneBadgeVariant,
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
  onSelect?: () => void
}

export function Process({ process, onSelect }: ProcessProps) {
  const tone = processTone(process.status)

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect?.()
        }
      }}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        tone === 'danger'
          ? cn(toneSurfaceClasses.danger, 'hover:bg-destructive/15')
          : 'hover:bg-muted/50',
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
      <Badge variant={toneBadgeVariant[tone]}>{process.status}</Badge>
      <span className='ml-auto shrink-0 text-xs tabular-nums text-muted-foreground'>
        {process.cpu}% · {formatMemory(process.memory)}
      </span>
    </div>
  )
}
