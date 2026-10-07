import { Server } from 'lucide-react'
import { CardDescription, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { StatBar } from '@/components/custom/stat-bar'
import { errorCodeLabel } from '@/lib/error-code'
import {
  percentTone,
  serverTone,
  toneIconClasses,
  toneTextClasses,
} from '@/lib/status-tone'
import { cn } from '@/lib/utils'
import type { ServerProcesses } from '@/types/dashboard'
import type { RegisteredServer } from '@/types/server'

type ServerHeaderProps = {
  server: RegisteredServer
  entry: ServerProcesses | undefined
}

export function ServerHeader({ server, entry }: ServerHeaderProps) {
  const tone = serverTone(entry)
  const overview = entry?.status === 'success' ? entry.overview : null

  return (
    <div className='flex h-full flex-col justify-between gap-3 px-(--card-spacing)'>
      <div className='flex min-w-0 items-center gap-3'>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            toneIconClasses[tone],
          )}
        >
          <Server strokeWidth={2} className='size-4.5' />
        </div>
        <div className='min-w-0 text-left'>
          <CardTitle className='truncate'>{server.server}</CardTitle>
          <CardDescription className='truncate'>
            {server.host}:{server.port}
          </CardDescription>
        </div>
      </div>

      {overview ? (
        <div className='grid grid-cols-2 gap-3 @max-2xs/server:grid-cols-1'>
          <StatBar
            label='CPU'
            value={overview.cpu.usagePercent}
            tone={percentTone(overview.cpu.usagePercent)}
          />
          <StatBar
            label='Mem'
            value={overview.memory.percentUsed}
            tone={percentTone(overview.memory.percentUsed)}
          />
        </div>
      ) : entry?.status === 'error' ? (
        <div
          className={cn(
            'truncate text-xs font-medium',
            toneTextClasses.danger,
          )}
          title={entry.requestError?.message}
        >
          {errorCodeLabel(entry.requestError?.code)}
        </div>
      ) : (
        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
          <Spinner className='size-3.5' />
          Loading…
        </div>
      )}
    </div>
  )
}
