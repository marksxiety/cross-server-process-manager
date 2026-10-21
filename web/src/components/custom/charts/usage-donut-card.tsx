import { lazy, memo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type { ChartTheme } from '@/hooks/use-chart-theme'
import type { UsageStatus } from '@/lib/server-usage'
import { cn } from '@/lib/utils'
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
  className?: string
}

function DonutSkeleton() {
  return (
    <div className='flex h-48 flex-col items-center justify-center gap-3'>
      <Skeleton className='size-28 rounded-full' />
      <div className='flex gap-2'>
        <Skeleton className='h-2.5 w-14' />
        <Skeleton className='h-2.5 w-14' />
        <Skeleton className='h-2.5 w-10' />
      </div>
    </div>
  )
}

function DonutEmpty() {
  return (
    <div className='flex h-48 items-center justify-center rounded-md border border-dashed px-4 text-center text-xs text-muted-foreground'>
      No data available
    </div>
  )
}

export const UsageDonutCard = memo(function UsageDonutCard({
  title,
  theme,
  pm2,
  other,
  status,
  className,
}: UsageDonutCardProps) {
  const resolvedStatus =
    status === 'ready' && (pm2 === null || other === null) ? 'empty' : status
  const hasData = resolvedStatus === 'ready'

  return (
    <ChartCard
      title={title}
      className={cn('h-full', className)}
      loading={resolvedStatus === 'loading'}
      hasData={hasData}
      loadingFallback={<DonutSkeleton />}
      emptyFallback={<DonutEmpty />}
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
