import { lazy, memo, Suspense, useMemo } from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ChartTheme } from '@/hooks/use-chart-theme'
import {
  formatUsagePercent,
  type UsageStatus,
} from '@/lib/server-usage'
import { cn } from '@/lib/utils'

const LazyEChart = lazy(() =>
  import('@/components/custom/echart').then((module) => ({
    default: module.EChart,
  })),
)

type ServerUsageDonutProps = {
  title: string
  label: string
  theme: ChartTheme
  pm2: number | null
  other: number | null
  status: UsageStatus
  className?: string
}

function buildOption(
  theme: ChartTheme,
  pm2: number,
  other: number,
  label: string,
): EChartsCoreOption {
  const free = Math.max(0, 100 - pm2 - other)

  return {
    animation: true,
    animationDuration: 300,
    animationDurationUpdate: 300,
    animationEasingUpdate: 'cubicOut',
    title: {
      text: formatUsagePercent(pm2),
      subtext: label,
      left: 'center',
      top: '38%',
      itemGap: 4,
      textStyle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.text,
      },
      subtextStyle: {
        fontSize: 12,
        color: theme.mutedText,
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

export const ServerUsageDonut = memo(function ServerUsageDonut({
  title,
  label,
  theme,
  pm2,
  other,
  status,
  className,
}: ServerUsageDonutProps) {
  const resolvedStatus =
    status === 'ready' && (pm2 === null || other === null) ? 'empty' : status
  const option = useMemo(
    () =>
      resolvedStatus === 'ready' && pm2 !== null && other !== null
        ? buildOption(theme, pm2, other, label)
        : null,
    [label, other, pm2, resolvedStatus, theme],
  )

  return (
    <Card size='sm' className={cn('h-full', className)}>
      <CardHeader className='pb-1'>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {resolvedStatus === 'loading' ? (
          <DonutSkeleton />
        ) : resolvedStatus === 'empty' || option === null ? (
          <DonutEmpty />
        ) : (
          <Suspense fallback={<DonutSkeleton />}>
            <LazyEChart
              option={option}
              ariaLabel={`${title} usage chart`}
              replaceSeries={false}
            />
          </Suspense>
        )}
      </CardContent>
    </Card>
  )
})
