import { lazy } from 'react'
import type { ChartTheme } from '@/hooks/use-chart-theme'
import type { UsageStatus } from '@/lib/server-usage'
import { ChartCard } from './chart-card'
import type { ChartCardBaseProps } from './chart-card'

const LazyUsageDonut = lazy(() =>
  import('./usage-donut').then((module) => ({
    default: module.UsageDonut,
  })),
)

export type UsageDonutCardProps = ChartCardBaseProps & {
  theme: ChartTheme
  pm2: number | null
  other: number | null
  status: UsageStatus
}

export function UsageDonutCard({
  title,
  theme,
  pm2,
  other,
  status,
  chartClassName,
  ...cardProps
}: UsageDonutCardProps) {
  const hasData = pm2 !== null && other !== null

  return (
    <ChartCard
      title={title}
      status={status}
      chartClassName={chartClassName}
      hasData={hasData}
      {...cardProps}
    >
      <LazyUsageDonut
        theme={theme}
        pm2={pm2 ?? 0}
        other={other ?? 0}
        ariaLabel={`${title} usage chart`}
        className={chartClassName}
      />
    </ChartCard>
  )
}
