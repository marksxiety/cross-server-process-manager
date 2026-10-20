import { lazy, Suspense, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { buildLineOption } from '@/components/custom/metric-chart-options'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

type MetricChartCardBase = {
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
}

export type MetricChartCardProps = MetricChartCardBase & {
  series: MetricChartSeries[]
  valueFormatter: (value: number | string) => string
  yAxisFormatter?: (value: number) => string
  yAxisMax?: number
  yAxisCategories?: string[]
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

function hasChartData(props: MetricChartCardProps): boolean {
  return props.series.some((entry) => entry.points.length > 0)
}

function buildOption(props: MetricChartCardProps): EChartsCoreOption {
  return buildLineOption({
    series: props.series,
    theme: props.theme,
    valueFormatter: props.valueFormatter,
    yAxisFormatter: props.yAxisFormatter,
    yAxisMax: props.yAxisMax,
    yAxisCategories: props.yAxisCategories,
  })
}

export function MetricChartCard(props: MetricChartCardProps) {
  const {
    title,
    description,
    emptyLabel,
    className,
    chartClassName,
    status,
    error,
    onRetry,
    action,
  } = props
  const hasData = hasChartData(props)
  const loading = status === 'loading' || status === 'idle'
  const option = useMemo(() => buildOption(props), [props])

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
