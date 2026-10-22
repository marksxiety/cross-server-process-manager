import { lazy } from 'react'
import type { ChartTheme } from '@/hooks/use-chart-theme'
import type { LoadStatus } from '@/types/dashboard'
import type { StatusTimelineData } from '@/types/prometheus'
import { ChartCard } from './chart-card'
import type { ChartCardBaseProps } from './chart-card'

const LazyStatusTimeline = lazy(() =>
  import('./status-timeline').then((module) => ({
    default: module.StatusTimeline,
  })),
)

export type StatusTimelineCardProps = ChartCardBaseProps & {
  theme: ChartTheme
  status?: LoadStatus
  data: StatusTimelineData
}

export function StatusTimelineCard({
  title,
  chartClassName,
  data,
  theme,
  ...cardProps
}: StatusTimelineCardProps) {
  const hasData = data.segments.length > 0

  return (
    <ChartCard
      title={title}
      chartClassName={chartClassName}
      hasData={hasData}
      {...cardProps}
    >
      <LazyStatusTimeline
        data={data}
        theme={theme}
        ariaLabel={`${title} chart`}
        className={chartClassName}
      />
    </ChartCard>
  )
}
