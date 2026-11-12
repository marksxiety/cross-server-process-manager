import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import type { ChartTheme } from '@/hooks/use-chart-theme'
import { combineStatus } from '@/lib/metric-status'
import { formatUsagePercent, type UsageStatus } from '@/lib/server-usage'
import { cn } from '@/lib/utils'
import type { ApiError } from '@/types/api'
import type { LoadStatus } from '@/types/dashboard'
import type { MetricChartSeries, ResolvedMetricsRange } from '@/types/prometheus'
import {
  ChartBodyError,
  ChartBodyLoading,
  ChartCard,
} from './chart-card'
import type { ChartCardBaseProps } from './chart-card'

const LazyUsageDonut = lazy(() =>
  import('./usage-donut').then((module) => ({
    default: module.UsageDonut,
  })),
)

const LazyLineChart = lazy(() =>
  import('./line-chart').then((module) => ({
    default: module.LineChart,
  })),
)

export type UsageTrendCardProps = Omit<
  ChartCardBaseProps,
  'error' | 'emptyLabel'
> & {
  theme: ChartTheme
  pm2: number | null
  other: number | null
  usageStatus: UsageStatus
  usageError?: ApiError | null
  trendSeries: MetricChartSeries[]
  trendStatus: LoadStatus
  trendError?: ApiError | null
  trendColor?: string
  trendValueFormatter: (value: number | string) => string
  trendYAxisFormatter?: (value: number) => string
  trendYAxisMax?: number
  timeRange?: ResolvedMetricsRange | null
  onTimeRangeSelect?: (start: number, end: number) => void
  onResetTimeRange?: () => void
}

type ChartSlotProps = {
  status: LoadStatus | UsageStatus
  hasData: boolean
  error?: ApiError | null
  onRetry?: () => void
  loadingLabel: string
  className?: string
  children: ReactNode
}

function toLoadStatus(status: UsageStatus): LoadStatus {
  if (status === 'loading') return 'loading'
  if (status === 'error') return 'error'
  return 'success'
}

function ChartSlot({
  status,
  hasData,
  error,
  onRetry,
  loadingLabel,
  className,
  children,
}: ChartSlotProps) {
  if (hasData) return <>{children}</>

  if (error) {
    return (
      <ChartBodyError
        error={error}
        onRetry={onRetry}
        chartClassName={className}
      />
    )
  }

  if (status === 'idle' || status === 'loading') {
    return (
      <ChartBodyLoading label={loadingLabel} chartClassName={className} />
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground',
        className ?? 'h-48',
      )}
    >
      No data in this range.
    </div>
  )
}

function UsageLegend({
  theme,
  pm2,
  other,
  free,
}: {
  theme: ChartTheme
  pm2: number
  other: number
  free: number
}) {
  const items = [
    { label: 'PM2', value: pm2, color: theme.usage.pm2 },
    { label: 'Other', value: other, color: theme.usage.other },
    { label: 'Free', value: free, color: theme.usage.free },
  ]

  return (
    <ul className='shrink-0 space-y-0.5 pt-1 text-[11px] text-muted-foreground'>
      {items.map((item) => (
        <li key={item.label} className='flex items-center gap-1.5'>
          <span
            className='size-2 shrink-0 rounded-sm'
            style={{ backgroundColor: item.color }}
            aria-hidden='true'
          />
          <span className='flex-1'>{item.label}</span>
          <span className='tabular-nums text-foreground'>
            {formatUsagePercent(item.value)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function UsageTrendCard({
  title,
  description,
  action,
  className,
  chartClassName,
  theme,
  pm2,
  other,
  usageStatus,
  usageError,
  trendSeries,
  trendStatus,
  trendError,
  trendColor,
  trendValueFormatter,
  trendYAxisFormatter,
  trendYAxisMax,
  timeRange,
  onTimeRangeSelect,
  onResetTimeRange,
  onRetry,
}: UsageTrendCardProps) {
  const donutHasData = pm2 !== null && other !== null
  const trendHasData = trendSeries.some((entry) => entry.points.length > 0)
  const hasData = donutHasData || trendHasData
  const free = Math.max(0, 100 - (pm2 ?? 0) - (other ?? 0))
  const sectionClassName = chartClassName ?? 'h-56 sm:h-64'
  const cardStatus = combineStatus(toLoadStatus(usageStatus), trendStatus)
  const cardError = usageError ?? trendError

  return (
    <ChartCard
      title={title}
      description={description}
      action={action}
      className={className}
      chartClassName={sectionClassName}
      status={cardStatus}
      hasData={hasData}
      error={cardError}
      onRetry={onRetry}
    >
      <div className='grid grid-cols-1 gap-2 sm:grid-cols-[minmax(170px,0.85fr)_minmax(0,1.4fr)]'>
        <div className={cn('min-w-0', sectionClassName)}>
          <ChartSlot
            status={usageStatus}
            hasData={donutHasData}
            error={usageError}
            onRetry={onRetry}
            loadingLabel={`Loading ${title}…`}
            className='h-full'
          >
            <div className='flex h-full flex-col'>
              <div className='min-h-0 flex-1'>
                <Suspense
                  fallback={
                    <ChartBodyLoading
                      label='Loading chart…'
                      chartClassName='h-full'
                    />
                  }
                >
                  <LazyUsageDonut
                    theme={theme}
                    pm2={pm2 ?? 0}
                    other={other ?? 0}
                    ariaLabel={`${title} usage chart`}
                    showLegend={false}
                    className='h-full w-full'
                  />
                </Suspense>
              </div>
              <UsageLegend
                theme={theme}
                pm2={pm2 ?? 0}
                other={other ?? 0}
                free={free}
              />
            </div>
          </ChartSlot>
        </div>

        <div className={cn('min-w-0', sectionClassName)}>
          <ChartSlot
            status={trendStatus}
            hasData={trendHasData}
            error={trendError}
            onRetry={onRetry}
            loadingLabel={`Loading ${title} trend…`}
            className='h-full'
          >
            <Suspense
              fallback={
                <ChartBodyLoading
                  label='Loading chart…'
                  chartClassName='h-full'
                />
              }
            >
              <LazyLineChart
                series={trendSeries}
                theme={theme}
                color={trendColor}
                valueFormatter={trendValueFormatter}
                yAxisFormatter={trendYAxisFormatter}
                yAxisMax={trendYAxisMax}
                timeRange={timeRange}
                onTimeRangeSelect={onTimeRangeSelect}
                onResetTimeRange={onResetTimeRange}
                ariaLabel={`${title} trend chart`}
                className='h-full w-full'
              />
            </Suspense>
          </ChartSlot>
        </div>
      </div>
    </ChartCard>
  )
}
