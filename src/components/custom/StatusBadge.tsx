import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusConfig {
  badge: string
  dot: string
  ping?: boolean
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  online: {
    badge:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-500',
    ping: true,
  },
  launching: {
    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    dot: 'bg-blue-500',
    ping: true,
  },
  'waiting restart': {
    badge:
      'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    dot: 'bg-amber-500',
    ping: true,
  },
  stopping: {
    badge:
      'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
    dot: 'bg-orange-500',
    ping: true,
  },
  stopped: {
    badge:
      'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
    dot: 'bg-slate-400 dark:bg-slate-500',
    ping: false,
  },
  errored: {
    badge: 'bg-destructive/15 text-destructive border-destructive/30',
    dot: 'bg-destructive',
    ping: false,
  },
  'one-launch-status': {
    badge:
      'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
    dot: 'bg-indigo-500',
    ping: false,
  },
}

const DEFAULT_CONFIG: StatusConfig = {
  badge: 'bg-muted text-muted-foreground border-border',
  dot: 'bg-muted-foreground',
  ping: false,
}

function getStatusConfig(status: string): StatusConfig {
  return STATUS_CONFIG[status.toLowerCase()] ?? DEFAULT_CONFIG
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = getStatusConfig(status)

  return (
    <Badge
      variant='outline'
      className={cn(
        'shrink-0 text-[10px] font-medium uppercase tracking-wide gap-1.5 px-2 py-0.5 inline-flex items-center',
        config.badge,
        className,
      )}
    >
      <span className='relative flex h-1.5 w-1.5'>
        {config.ping && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
              config.dot,
            )}
          />
        )}
        <span
          className={cn(
            'relative inline-flex h-1.5 w-1.5 rounded-full',
            config.dot,
          )}
        />
      </span>
      {status}
    </Badge>
  )
}
