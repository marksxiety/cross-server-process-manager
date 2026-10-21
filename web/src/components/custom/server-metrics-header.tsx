import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { MetricsToolbar } from '@/components/custom/metrics-toolbar'
import { normalizeMetricsRefreshMs } from '@/lib/prometheus'
import { useMetricsStore } from '@/stores/metrics.store'

export type ServerMetricsHeaderProps = {
  serverName: string
  host: string | null
  port: number | null
  isRefreshing: boolean
  onRefresh: () => void
  disabled?: boolean
}

export function ServerMetricsHeader({
  serverName,
  host,
  port,
  isRefreshing,
  onRefresh,
  disabled = false,
}: ServerMetricsHeaderProps) {
  const range = useMetricsStore((state) => state.range)
  const setRange = useMetricsStore((state) => state.setRange)
  const refreshMs = useMetricsStore((state) => state.refreshMs)
  const setRefreshMs = useMetricsStore((state) => state.setRefreshMs)
  const activeRefreshMs = normalizeMetricsRefreshMs(refreshMs)

  return (
    <div className='mb-4 space-y-2'>
      <Link
        to='/'
        className='inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground'
      >
        <ArrowLeft className='size-3.5' strokeWidth={2} />
        Dashboard
      </Link>

      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div className='min-w-0'>
          <h1 className='text-lg font-semibold tracking-tight sm:text-xl'>
            Server metrics · {serverName}
          </h1>
          <p className='text-xs text-muted-foreground'>
            {host && port !== null
              ? `${host}:${port}`
              : 'Loading server details…'}
          </p>
        </div>

        <div className='w-full lg:w-auto lg:shrink-0'>
          <MetricsToolbar
            range={range}
            refreshMs={activeRefreshMs}
            isRefreshing={isRefreshing}
            onRangeChange={setRange}
            onRefreshMsChange={setRefreshMs}
            onRefresh={onRefresh}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
