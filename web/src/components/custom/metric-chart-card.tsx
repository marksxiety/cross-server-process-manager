import { lazy, Suspense, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { ChartTheme } from '@/hooks/use-chart-theme'
import { cn } from '@/lib/utils'
import type { ApiError } from '@/types/api'
import type { LoadStatus } from '@/types/dashboard'
import type { MetricChartSeries } from '@/types/prometheus'

export type { MetricChartSeries } from '@/types/prometheus'

const LazyEChart = lazy(() =>
  import('@/components/custom/echart').then((module) => ({
    default: module.EChart,
  })),
)

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
  chartClassName?: string
  status?: LoadStatus
  error?: ApiError | null
  onRetry?: () => void
  action?: ReactNode
}

function ChartBodyLoading({
  label,
  chartClassName,
}: {
  label: string
  chartClassName?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 rounded-md border border-dashed text-xs text-muted-foreground',
        chartClassName ?? 'h-48',
      )}
    >
      <Spinner className='size-4' />
      {label}
    </div>
  )
}

function ChartBodyError({
  error,
  onRetry,
  chartClassName,
}: {
  error: ApiError
  onRetry?: () => void
  chartClassName?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 text-center text-xs text-muted-foreground',
        chartClassName ?? 'h-48',
      )}
    >
      <TriangleAlert className='size-4 text-destructive' strokeWidth={2} />
      <p className='line-clamp-2 max-w-full break-words' title={error.message}>
        {error.message}
      </p>
      {onRetry && (
        <Button type='button' variant='outline' size='xs' onClick={onRetry}>
          <RefreshCw strokeWidth={2} />
          Retry
        </Button>
      )}
    </div>
  )
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
  chartClassName,
  status,
  error,
  onRetry,
  action,
}: MetricChartCardProps) {
  const hasData = series.some((entry) => entry.points.length > 0)
  const loading = status === 'loading' || status === 'idle'

  const option = useMemo<EChartsCoreOption>(() => {
    const showLegend = series.length > 1

    return {
      animation: true,
      animationDuration: 300,
      animationDurationUpdate: 300,
      animationEasingUpdate: 'cubicOut',
      grid: {
        left: 8,
        right: 14,
        top: 12,
        bottom: showLegend ? 42 : 6,
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
            type: 'scroll',
            bottom: 0,
            left: 0,
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
        id: entry.id,
        name: entry.name,
        type: 'line',
        data: entry.points,
        showSymbol: false,
        step: entry.stepped ? 'end' : false,
        lineStyle: {
          width: 1.5,
          color: entry.color,
          type: entry.dashed ? 'dashed' : 'solid',
        },
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
        {(action || (hasData && error)) && (
          <CardAction>
            <div className='flex items-center gap-1'>
              {action}
              {hasData && error && (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-xs'
                  className='text-destructive'
                  aria-label={`Retry ${title}`}
                  title={error.message}
                  onClick={onRetry}
                >
                  <TriangleAlert strokeWidth={2} />
                </Button>
              )}
            </div>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {!hasData && loading ? (
          <ChartBodyLoading
            label={`Loading ${title}…`}
            chartClassName={chartClassName}
          />
        ) : !hasData && error ? (
          <ChartBodyError
            error={error}
            onRetry={onRetry}
            chartClassName={chartClassName}
          />
        ) : !hasData ? (
          <div
            className={cn(
              'flex items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground',
              chartClassName ?? 'h-48',
            )}
          >
            {emptyLabel ?? 'No data in this range.'}
          </div>
        ) : (
          <Suspense
            fallback={
              <ChartBodyLoading
                label='Loading chart…'
                chartClassName={chartClassName}
              />
            }
          >
            <LazyEChart
              option={option}
              ariaLabel={`${title} chart`}
              className={chartClassName}
            />
          </Suspense>
        )}
      </CardContent>
    </Card>
  )
}
