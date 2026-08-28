import { cn } from '@/lib/utils'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ServerInfo } from '@/types'

const STATUS_LED: Record<string, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  crit: 'bg-destructive',
  offline: 'bg-muted-foreground/40',
}

type ServerSeverity = 'ok' | 'warn' | 'crit' | 'offline'

/**
 * Worst-status-wins severity from the system-overview payload.
 * Thresholds: mem green <75, warn 75-89, crit >=90.
 * cpu: loadAvg[0]/cores - green <=0.7, warn 0.7-1.0, crit >1.0.
 * `offline` covers no-data-yet / unreachable-unconfirmed / confirmed-offline.
 */
function getServerSeverity(server: ServerInfo): ServerSeverity {  if (!server.host || server.status === 'offline') return 'offline'

  const { cpu, memory } = server.host
  const loadRatio = cpu.loadAvg[0] / cpu.cores

  if (memory.percentUsed >= 90 || loadRatio > 1.0) return 'crit'
  if (memory.percentUsed >= 75 || loadRatio >= 0.7) return 'warn'
  return 'ok'
}

function Vents() {
  return (
    <div className="flex shrink-0 items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-5 w-0.5 rounded-full bg-border" />
      ))}
    </div>
  )
}

interface ServerTileProps {
  server: ServerInfo
  onClick?: (server: ServerInfo) => void
  error?: string
}

export function ServerTile({ server, onClick, error }: ServerTileProps) {
  const severity = getServerSeverity(server)
  const isOffline = severity === 'offline'
  const memPercent = server.host ? Math.round(server.host.memory.percentUsed) : null
  const loadAvg = server.host ? server.host.cpu.loadAvg[0].toFixed(2) : null

  const tile = (
    <div
      onClick={onClick ? () => onClick(server) : undefined}
      className={cn(
        'flex min-w-0 items-center gap-2.5 rounded-md border bg-muted/40 px-3 py-2.5',
        onClick && 'cursor-pointer select-none transition-colors duration-150 ease-out hover:bg-muted/60',
        severity === 'crit' && 'border-destructive/40',
      )}
    >
      <span
        className={cn('h-2 w-2 shrink-0 rounded-full', error ? 'bg-destructive' : STATUS_LED[severity])}
        aria-hidden="true"
      />

      <Vents />

      <div className="min-w-0 flex-1 border-l pl-2.5">
        <p className="truncate font-mono text-xs font-medium tracking-tight">{server.name}</p>
        <p className="truncate font-mono text-[10px] text-muted-foreground">{server.ip_address}</p>
        {server.host && (
          <p className="truncate text-[10px] text-muted-foreground/70">{server.host.cpu.model}</p>
        )}
      </div>

      {isOffline ? (
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {error ? 'error' : 'offline'}
        </span>
      ) : (
        <div className="flex shrink-0 flex-col gap-1 border-l pl-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] text-muted-foreground">load</span>
            <span className="font-mono text-[11px] font-medium">{loadAvg}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] text-muted-foreground">mem</span>
            <span className="font-mono text-[11px] font-medium">{memPercent}%</span>
          </div>
        </div>
      )}
    </div>
  )

  if (!error) return tile

  return (
    <HoverCard>
      <HoverCardTrigger className="block w-full">{tile}</HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="max-w-72">
        <p className="font-medium text-destructive">Fetch failed</p>
        <ScrollArea className="mt-1 max-h-40">
          <p className="wrap-break-word text-muted-foreground">{error}</p>
        </ScrollArea>
      </HoverCardContent>
    </HoverCard>
  )
}