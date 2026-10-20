import { useMemo } from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EChart } from '@/components/custom/echart'
import type { ChartTheme } from '@/hooks/use-chart-theme'
import { cn } from '@/lib/utils'

export interface MetricChartSeries {
  name: string
  color: string
  points: Array<[number, number | string]>
  stepped?: boolean
  filled?: boolean
}

type MetricChartCardProps = {
  title: string
  description?: string
  series: MetricChartSeries[]
  theme: ChartTheme
  valueFormatter: (value: number | string) => string
  yAxisFormatter?: (value: number) => string
  yAxisMax?: number
  yAxisCategories?: string[]
  emptyLabel?: string
  className?: string
}

export function MetricChartCard({
  title,
  description,
  series,
  theme,
  valueFormatter,
  yAxisFormatter,
  yAxisMax,
  yAxisCategories,
  emptyLabel,
  className,
}: MetricChartCardProps) {
  const hasData = series.some((entry) => entry.points.length > 0)

  const option = useMemo<EChartsCoreOption>(() => {
    const showLegend = series.length > 1

    return {
      animation: false,
      grid: {
        left: 8,
        right: 14,
        top: showLegend ? 30 : 12,
        bottom: 6,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: theme.tooltipBackground,
        borderColor: theme.border,
        borderWidth: 1,
        textStyle: { color: theme.text, fontSize: 11 },
        valueFormatter: (value: unknown) =>
          valueFormatter(value as number | string),
        axisPointer: {
          type: 'line',
          lineStyle: { color: theme.mutedText, opacity: 0.35 },
        },
      },
      legend: showLegend
        ? {
            top: 0,
            right: 0,
            itemWidth: 8,
            itemHeight: 8,
            icon: 'roundRect',
            textStyle: { color: theme.mutedText, fontSize: 10 },
          }
        : undefined,
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: theme.border } },
        axisTick: { show: false },
        axisLabel: { color: theme.mutedText, fontSize: 10, hideOverlap: true },
        splitLine: { show: false },
      },
      yAxis: yAxisCategories
        ? {
            type: 'category',
            data: yAxisCategories,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: theme.mutedText, fontSize: 10 },
            splitLine: {
              lineStyle: { color: theme.border, opacity: 0.5 },
            },
          }
        : {
            type: 'value',
            min: 0,
            max: yAxisMax,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: theme.mutedText,
              fontSize: 10,
              formatter: yAxisFormatter,
            },
            splitLine: {
              lineStyle: { color: theme.border, opacity: 0.5 },
            },
          },
      series: series.map((entry) => ({
        name: entry.name,
        type: 'line',
        data: entry.points,
        showSymbol: false,
        step: entry.stepped ? 'end' : false,
        lineStyle: { width: 1.5, color: entry.color },
        itemStyle: { color: entry.color },
        areaStyle: entry.filled
          ? { color: entry.color, opacity: 0.08 }
          : undefined,
        emphasis: { focus: 'series' },
      })),
    }
  }, [
    series,
    theme,
    valueFormatter,
    yAxisFormatter,
    yAxisMax,
    yAxisCategories,
  ])

  return (
    <Card size='sm' className={cn(className)}>
      <CardHeader className='pb-1'>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {hasData ? (
          <EChart option={option} ariaLabel={`${title} chart`} />
        ) : (
          <div className='flex h-48 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground'>
            {emptyLabel ?? 'No data in this range.'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
