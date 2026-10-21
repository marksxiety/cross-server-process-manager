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
import { StatBar } from '@/components/custom/stat-bar'
import { StatusDot } from '@/components/custom/status-dot'
import { formatBytes, memorySharePercent } from '@/lib/format'
import { isProcessInactive } from '@/lib/process-status'
import { serverCpuShare } from '@/lib/server-usage'
import { getStatusVisual } from '@/lib/status-styles'
import { percentTone } from '@/lib/status-tone'
import { cn } from '@/lib/utils'
import type { ProcessSummary } from '@/types/process'

type ProcessCardProps = {
  process: ProcessSummary
  serverLabel?: string
  /** Total RAM of the process's host, when known; enables the memory share %. */
  totalMemoryBytes?: number | null
  /** Logical CPU cores of the process's host; enables the server CPU share %. */
  cpuCores?: number | null
  onSelect?: () => void
}

function StatText({ label, value }: { label: string; value: string }) {
  return (
    <div className='w-full min-w-0'>
      <div className='mb-0.5 flex justify-between text-xs uppercase tracking-wide text-muted-foreground'>
        <span>{label}</span>
      </div>
      <span className='text-xs tabular-nums text-muted-foreground'>{value}</span>
    </div>
  )
}

export function ProcessCard({
  process,
  serverLabel,
  totalMemoryBytes,
  cpuCores,
  onSelect,
}: ProcessCardProps) {
  const visual = getStatusVisual(process)
  const memoryShare = memorySharePercent(process.memory, totalMemoryBytes)
  const cpuShare = serverCpuShare(process.cpu, cpuCores ?? null)
  const inactive = isProcessInactive(process)

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
        visual.surface,
        visual.ring,
        'hover:bg-accent/40',
      )}
    >
      <CardHeader>
        <CardTitle className='flex min-w-0 items-center gap-2'>
          <StatusDot process={process} />
          <span className={cn('min-w-0 flex-1 truncate', visual.text)}>
            {process.name}
          </span>
          <Badge
            variant='outline'
            className='max-w-[50%] shrink-0 truncate font-normal text-muted-foreground'
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
          <Badge
            variant='outline'
            className={cn('border', visual.surface, visual.text, visual.border)}
          >
            {visual.label}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className='mt-auto grid grid-cols-2 gap-3'>
        {cpuShare !== null ? (
          <StatBar
            label='CPU'
            value={cpuShare}
            tone={inactive ? 'neutral' : percentTone(cpuShare)}
          />
        ) : (
          <StatText label='CPU' value='—' />
        )}
        {memoryShare !== null ? (
          <StatBar
            label='Mem'
            value={memoryShare}
            tone={inactive ? 'neutral' : percentTone(memoryShare)}
          />
        ) : (
          <StatText label='Mem' value={formatBytes(process.memory)} />
        )}
      </CardContent>
    </Card>
  )
}
