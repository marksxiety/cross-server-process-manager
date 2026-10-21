import { useMemo } from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import type { ChartTheme } from '@/hooks/use-chart-theme'
import { formatUsagePercent } from '@/lib/server-usage'
import { EChart } from './echart'

export type UsageDonutProps = {
  theme: ChartTheme
  pm2: number
  other: number
  ariaLabel: string
  className?: string
}

function buildOption(
  theme: ChartTheme,
  pm2: number,
  other: number,
): EChartsCoreOption {
  const free = Math.max(0, 100 - pm2 - other)

  return {
    animation: true,
    animationDuration: 300,
    animationDurationUpdate: 300,
    animationEasingUpdate: 'cubicOut',
    title: {
      text: formatUsagePercent(pm2),
      left: 'center',
      top: '38%',
      textStyle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.text,
      },
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: theme.tooltipBackground,
      borderColor: theme.border,
      borderWidth: 1,
      textStyle: { color: theme.text, fontSize: 11 },
      valueFormatter: (value: unknown) =>
        formatUsagePercent(Number(value)),
    },
    legend: {
      bottom: 0,
      left: 'center',
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 11, color: theme.mutedText },
    },
    series: [
      {
        id: 'server-usage',
        name: 'Server usage',
        type: 'pie',
        radius: ['55%', '78%'],
        center: ['50%', '46%'],
        startAngle: 90,
        minAngle: 3,
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: theme.tooltipBackground,
          borderWidth: 2,
        },
        label: { show: false },
        labelLine: { show: false },
        emphasis: { scale: false, label: { show: false } },
        data: [
          {
            value: pm2,
            name: 'PM2 processes',
            itemStyle: { color: theme.usage.pm2 },
          },
          {
            value: other,
            name: 'Other on host',
            itemStyle: { color: theme.usage.other },
          },
          {
            value: free,
            name: 'Free',
            itemStyle: { color: theme.usage.free },
          },
        ],
      },
    ],
  }
}

export function UsageDonut({
  theme,
  pm2,
  other,
  ariaLabel,
  className,
}: UsageDonutProps) {
  const option = useMemo(
    () => buildOption(theme, pm2, other),
    [other, pm2, theme],
  )

  return (
    <EChart
      option={option}
      ariaLabel={ariaLabel}
      className={className}
      replaceSeries={false}
    />
  )
}
