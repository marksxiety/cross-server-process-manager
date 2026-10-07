import type { KeyboardEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { StatusDot } from '@/components/custom/status-dot'
import { formatBytes } from '@/lib/format'
import {
  processTone,
  toneBadgeVariant,
  toneSurfaceClasses,
  toneTextClasses,
} from '@/lib/status-tone'
import { cn } from '@/lib/utils'
import type { ProcessSummary } from '@/types/process'

type ProcessCardProps = {
  process: ProcessSummary
  serverLabel?: string
  onSelect?: () => void
}

export function ProcessCard({ process, serverLabel, onSelect }: ProcessCardProps) {
  const tone = processTone(process.status)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect?.()
    }
  }

  return (
    <Card
      size='sm'
      role='button'
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        'h-full cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        tone === 'danger'
          ? cn(toneSurfaceClasses.danger, 'hover:bg-destructive/15')
          : 'hover:bg-accent/40',
      )}
    >
      <CardHeader>
        <CardTitle className='flex min-w-0 items-center gap-2'>
          <StatusDot tone={tone} />
          <span
            className={cn(
              'min-w-0 truncate',
              tone === 'danger' && toneTextClasses.danger,
            )}
          >
            {process.name}
          </span>
          <Badge
            variant='outline'
            className='shrink-0 font-normal text-muted-foreground'
          >
            {process.namespace}
          </Badge>
        </CardTitle>
        {serverLabel && (
          <CardDescription className='truncate font-mono text-[11px]'>
            {serverLabel}
          </CardDescription>
        )}
        <CardAction>
          <Badge variant={toneBadgeVariant[tone]}>{process.status}</Badge>
        </CardAction>
      </CardHeader>

      <CardContent className='flex items-center justify-between text-xs tabular-nums text-muted-foreground'>
        <span>CPU {process.cpu}%</span>
        <span>{formatBytes(process.memory)}</span>
      </CardContent>
    </Card>
  )
}
