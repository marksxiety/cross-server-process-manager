import { lazy } from 'react'
import type { ChartTheme } from '@/hooks/use-chart-theme'
import type { LoadStatus } from '@/types/dashboard'
import type { MetricChartSeries } from '@/types/prometheus'
import { ChartCard } from './chart-card'
import type { ChartCardBaseProps } from './chart-card'

const LazyLineChart = lazy(() =>
  import('./line-chart').then((module) => ({
    default: module.LineChart,
  })),
)

export type LineChartCardProps = ChartCardBaseProps & {
  theme: ChartTheme
  status?: LoadStatus
  series: MetricChartSeries[]
  valueFormatter: (value: number | string) => string
  yAxisFormatter?: (value: number) => string
  yAxisMax?: number
  yAxisCategories?: string[]
}

export function LineChartCard({
  title,
  chartClassName,
  series,
  theme,
  valueFormatter,
  yAxisFormatter,
  yAxisMax,
  yAxisCategories,
  ...cardProps
}: LineChartCardProps) {
  const hasData = series.some((entry) => entry.points.length > 0)

  return (
    <ChartCard
      title={title}
      chartClassName={chartClassName}
      hasData={hasData}
      {...cardProps}
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
