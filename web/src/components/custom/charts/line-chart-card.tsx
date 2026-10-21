import { lazy } from 'react'
import type { ReactNode } from 'react'
import type { ChartTheme } from '@/hooks/use-chart-theme'
import type { ApiError } from '@/types/api'
import type { LoadStatus } from '@/types/dashboard'
import type { MetricChartSeries } from '@/types/prometheus'
import { ChartCard } from './chart-card'

const LazyLineChart = lazy(() =>
  import('./line-chart').then((module) => ({
    default: module.LineChart,
  })),
)

export type LineChartCardProps = {
  title: string
  description?: string
  theme: ChartTheme
  emptyLabel?: string
  className?: string
  chartClassName?: string
  status?: LoadStatus
  error?: ApiError | null
  onRetry?: () => void
  action?: ReactNode
  series: MetricChartSeries[]
  valueFormatter: (value: number | string) => string
  yAxisFormatter?: (value: number) => string
  yAxisMax?: number
  yAxisCategories?: string[]
}

export function LineChartCard({
  title,
  description,
  theme,
  emptyLabel,
  className,
  chartClassName,
  status,
  error,
  onRetry,
  action,
  series,
  valueFormatter,
  yAxisFormatter,
  yAxisMax,
  yAxisCategories,
}: LineChartCardProps) {
  const hasData = series.some((entry) => entry.points.length > 0)
  const loading = status === 'loading' || status === 'idle'

  return (
    <ChartCard
      title={title}
      description={description}
      action={action}
      className={className}
      chartClassName={chartClassName}
      loading={loading}
      hasData={hasData}
      error={error}
      onRetry={onRetry}
      emptyLabel={emptyLabel}
    >
      <LazyLineChart
        series={series}
        theme={theme}
        valueFormatter={valueFormatter}
        yAxisFormatter={yAxisFormatter}
        yAxisMax={yAxisMax}
        yAxisCategories={yAxisCategories}
        ariaLabel={`${title} chart`}
        className={chartClassName}
      />
    </ChartCard>
  )
}
