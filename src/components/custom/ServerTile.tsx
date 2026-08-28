import { cn } from '@/lib/utils'
import { useEffect } from 'react'
import type { ServerInfo } from '@/types'
import { StatusBadge } from '@/components/custom/StatusBadge'

type ServerSeverity = 'ok' | 'warn' | 'crit' | 'offline'

const SEVERITY_STYLES: Record<
  ServerSeverity,
  {
    bg: string
    border: string
    separator: string
    vent: string
  }
> = {
  ok: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    separator: 'bg-emerald-500/30',
    vent: 'bg-emerald-500',
  },
  warn: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    separator: 'bg-amber-500/30',
    vent: 'bg-amber-500',
  },
  crit: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    separator: 'bg-destructive/30',
    vent: 'bg-destructive',
  },
  offline: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    separator: 'bg-destructive/30',
    vent: 'bg-destructive',
  },
}

/**
 * Worst-status-wins severity from the system-overview payload.
 * Thresholds: mem green <75, warn 75-89, crit >=90.
 * cpu: loadAvg[0]/cores - green <=0.7, warn 0.7-1.0, crit >1.0.
 * `offline` covers no-data-yet / unreachable-unconfirmed / confirmed-offline.
 */
function getServerSeverity(server: ServerInfo, hasError?: boolean): ServerSeverity {
  if (!server.host || server.status === 'offline' || hasError) return 'offline'

  const { cpu, memory } = server.host
  const loadRatio = cpu.loadAvg[0] / cpu.cores

  if (memory.percentUsed >= 90 || loadRatio > 1.0) return 'crit'
  if (memory.percentUsed >= 75 || loadRatio >= 0.7) return 'warn'
  return 'ok'
}

interface VentsProps {
  severity: ServerSeverity
}

function Vents({ severity }: VentsProps) {
  return (
    <div className="flex shrink-0 items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={cn('h-5 w-0.5 rounded-full', SEVERITY_STYLES[severity].vent)} />
      ))}
    </div>
  )
}

interface MetricProps {
  label: string
  value: string
  danger?: boolean
}

function Metric({ label, value, danger }: MetricProps) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-3">
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn('font-mono text-[11px] font-medium', danger && 'text-destructive')}>{value}</span>
    </div>
  )
}

interface ServerTileProps {
  server: ServerInfo
  onClick?: (server: ServerInfo) => void
  error?: string
}

export function ServerTile({ server, onClick, error }: ServerTileProps) {
  useEffect(() => {
    if (error) console.error(`[ServerTile] ${server.name} (${server.ip_address}):`, error)
  }, [error, server])

  const severity = getServerSeverity(server, !!error)
  const isOffline = severity === 'offline'
  const styles = SEVERITY_STYLES[severity]
  const badgeStatus = isOffline ? 'error' : severity === 'crit' ? 'critical' : severity === 'warn' ? 'warning' : 'online'

  const memPercent = server.host ? Math.round(server.host.memory.percentUsed) : null
  const loadAvg = server.host ? server.host.cpu.loadAvg[0].toFixed(2) : null
  const loadRatio = server.host ? (server.host.cpu.loadAvg[0] / server.host.cpu.cores).toFixed(2) : null

  return (
    <div
      onClick={onClick ? () => onClick(server) : undefined}
      className={cn(
        'flex min-w-0 items-center gap-2.5 rounded-md border px-3 py-3 transition-colors duration-150 ease-out',
        styles.bg,
        styles.border,
        onClick && 'cursor-pointer select-none hover:brightness-95 dark:hover:brightness-110',
      )}
    >
      <Vents severity={severity} />

      <div className={cn('min-w-0 flex-1 border-l pl-2.5', styles.border)}>
        <p className="truncate font-mono text-xs font-medium tracking-tight">{server.name}</p>
        <p className="truncate font-mono text-[10px] text-muted-foreground">{server.ip_address}</p>
      </div>

      {!isOffline && (
        <div className={cn('flex shrink-0 items-center pl-2.5', styles.border)}>
          <Metric label="CPU" value={loadRatio ?? '–'} danger={severity === 'crit'} />
          <span className={cn('h-5.5 w-px', styles.separator)} />
          <Metric label="MEM" value={memPercent !== null ? `${memPercent}%` : '–'} danger={severity === 'crit'} />
          <span className={cn('h-5.5 w-px', styles.separator)} />
          <Metric label="LOAD" value={loadAvg ?? '–'} />
        </div>
      )}

      <StatusBadge status={badgeStatus} />
    </div>
  )
}