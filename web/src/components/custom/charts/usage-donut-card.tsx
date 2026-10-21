import { lazy, memo } from 'react'
import type { ReactNode } from 'react'
import type { ChartTheme } from '@/hooks/use-chart-theme'
import type { UsageStatus } from '@/lib/server-usage'
import { cn } from '@/lib/utils'
import type { ApiError } from '@/types/api'
import { ChartCard } from './chart-card'

const LazyUsageDonut = lazy(() =>
  import('./usage-donut').then((module) => ({
    default: module.UsageDonut,
  })),
)

export type UsageDonutCardProps = {
  title: string
  theme: ChartTheme
  pm2: number | null
  other: number | null
  status: UsageStatus
  error?: ApiError | null
  onRetry?: () => void
  action?: ReactNode
  className?: string
}

export const UsageDonutCard = memo(function UsageDonutCard({
  title,
  theme,
  pm2,
  other,
  status,
  error,
  onRetry,
  action,
  className,
}: UsageDonutCardProps) {
  const resolvedStatus =
    status === 'ready' && (pm2 === null || other === null) ? 'empty' : status
  const hasData = resolvedStatus === 'ready'

  return (
    <ChartCard
      title={title}
      action={action}
      className={cn('h-full', className)}
      loading={resolvedStatus === 'loading'}
      hasData={hasData}
      error={error}
      onRetry={onRetry}
    >
      <LazyUsageDonut
        theme={theme}
        pm2={pm2 ?? 0}
        other={other ?? 0}
        ariaLabel={`${title} usage chart`}
      />
    </ChartCard>
  )
})
