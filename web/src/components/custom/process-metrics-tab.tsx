import { Activity } from 'lucide-react'
import { isPrometheusConfigured, toPrometheusApiError } from '@/api/services/prometheus.service'
import { ErrorAlert } from '@/components/custom/error-alert'
import {
  MetricChartCard,
  type MetricChartSeries,
} from '@/components/custom/metric-chart-card'
import { MetricsToolbar } from '@/components/custom/metrics-toolbar'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { formatBytes, formatPercent, memorySharePercent } from '@/lib/format'
import { useChartTheme } from '@/hooks/use-chart-theme'
import { useProcessMetrics } from '@/hooks/use-process-metrics'
import {
  PM2_STATUS_LABELS,
  formatMetricAxisValue,
  formatMetricValue,
  lastValue,
  normalizeMetricsRefreshMs,
  statusLabel,
} from '@/lib/prometheus'
import { useMetricsStore } from '@/stores/metrics.store'
import type {
  MetricsData,
  ProcessMetricName,
  PrometheusSeries,
} from '@/types/prometheus'
import type { ProcessSummary } from '@/types/process'
import type { RegisteredServer } from '@/types/server'

type ProcessMetricsTabProps = {
  server: RegisteredServer
  process: ProcessSummary
  totalMemoryBytes: number | null
  active: boolean
}

const STATUS_CATEGORIES = [...PM2_STATUS_LABELS]

function metricValueFormatter(metric: ProcessMetricName) {
  return (value: number | string) => formatMetricValue(metric, Number(value))
}

function metricAxisFormatter(metric: ProcessMetricName) {
  return (value: number) => formatMetricAxisValue(metric, value)
}

const formatCpuValue = metricValueFormatter('pm2_cpu')
const formatCpuAxis = metricAxisFormatter('pm2_cpu')
const formatMemoryValue = metricValueFormatter('pm2_memory')
const formatMemoryAxis = metricAxisFormatter('pm2_memory')
const formatUptimeValue = metricValueFormatter('pm2_uptime')
const formatUptimeAxis = metricAxisFormatter('pm2_uptime')
const formatRestartsValue = metricValueFormatter('pm2_restarts_total')
const formatRestartsAxis = metricAxisFormatter('pm2_restarts_total')

function toChartSeries(
  seriesList: PrometheusSeries[] | undefined,
  color: string,
  options?: {
    stepped?: boolean
    filled?: boolean
    name?: string
    mapValue?: (value: number) => number | string
  },
): MetricChartSeries[] {
  return (seriesList ?? [])
    .filter((series) => series.points.length > 0)
    .map((series) => ({
      name: options?.name ?? series.metric.name ?? 'Process',
      color,
      stepped: options?.stepped,
      filled: options?.filled,
      points: series.points.map(
        (point) =>
          [
            point.timestamp,
            options?.mapValue ? options.mapValue(point.value) : point.value,
          ] as [number, number | string],
      ),
    }))
}

function hasAnyData(data: MetricsData): boolean {
  return Object.values(data).some((seriesList) =>
    seriesList?.some((series) => series.points.length > 0),
  )
}

export function ProcessMetricsTab({
  server,
  process,
  totalMemoryBytes,
  active,
}: ProcessMetricsTabProps) {
  const range = useMetricsStore((state) => state.range)
  const setRange = useMetricsStore((state) => state.setRange)
  const refreshMs = useMetricsStore((state) => state.refreshMs)
  const setRefreshMs = useMetricsStore((state) => state.setRefreshMs)
  const theme = useChartTheme()
  const configured = isPrometheusConfigured()
  const activeRefreshMs = normalizeMetricsRefreshMs(refreshMs)

  const metrics = useProcessMetrics({
    server,
    process,
    range,
    refreshMs: activeRefreshMs,
    enabled: configured && active,
  })

  const cpuSeries = metrics.data.pm2_cpu
  const memorySeries = metrics.data.pm2_memory
  const statusSeries = metrics.data.pm2_status
  const restartsSeries = metrics.data.pm2_restarts_total
  const unstableSeries = metrics.data.pm2_unstable_restarts_total
  const uptimeSeries = metrics.data.pm2_uptime
  const startTimeSeries = metrics.data.pm2_start_time_seconds

  const cpuLast = lastValue(cpuSeries)
  const memoryLast = lastValue(memorySeries)
  const statusLast = lastValue(statusSeries)
  const restartsLast = lastValue(restartsSeries)
  const unstableLast = lastValue(unstableSeries)
  const uptimeLast = lastValue(uptimeSeries)
  const startedAt = lastValue(startTimeSeries)

  const memoryPercentTotal =
    typeof totalMemoryBytes === 'number' &&
    Number.isFinite(totalMemoryBytes) &&
    totalMemoryBytes > 0
      ? totalMemoryBytes
      : null
  const memoryLastPercent =
    memoryLast === null || memoryPercentTotal === null
      ? null
      : memorySharePercent(memoryLast, memoryPercentTotal)
  const memoryDescription =
    memoryLast === null
      ? 'No data in this range.'
      : memoryLastPercent === null
        ? formatMemoryValue(memoryLast)
        : `${formatPercent(memoryLastPercent, 1)} of host RAM · ${formatBytes(memoryLast)}`
  const memoryChartSeries = toChartSeries(memorySeries, theme.series.memory, {
    filled: true,
    mapValue: (value) =>
      memoryPercentTotal === null
        ? value
        : (memorySharePercent(value, memoryPercentTotal) ?? 0),
  })
  const memoryValueFormatter = (value: number | string) => {
    if (memoryPercentTotal === null) return formatMemoryValue(value)

    const percent = Number(value)
    return `${formatPercent(percent, 1)} (${formatBytes(
      (percent / 100) * memoryPercentTotal,
    )})`
  }
  const memoryAxisFormatter = (value: number) => {
    if (memoryPercentTotal === null) return formatMemoryAxis(value)
    return `${Math.round(value)}%`
  }

  const chartData = hasAnyData(metrics.data)
  const loading =
    (metrics.status === 'idle' || metrics.status === 'loading') && !chartData
  const apiError = metrics.error ? toPrometheusApiError(metrics.error) : null

  if (!configured) {
    return (
      <Empty className='my-6'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <Activity strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>Prometheus not configured</EmptyTitle>
          <EmptyDescription>
            Set VITE_PROMETHEUS_URL in .env to the browser-reachable Prometheus
            URL, then restart the dashboard.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <MetricsToolbar
        range={range}
        refreshMs={activeRefreshMs}
        lastUpdated={metrics.lastUpdated}
        isRefreshing={metrics.isRefreshing}
        hasError={metrics.error !== null}
        onRangeChange={setRange}
        onRefreshMsChange={setRefreshMs}
        onRefresh={metrics.refresh}
      />

      <ScrollArea className='min-h-0 flex-1'>
        <div className='space-y-3 py-3 px-3'>
          {apiError && (
            <ErrorAlert error={apiError} onRetry={metrics.refresh} />
          )}

          {loading && !apiError && (
            <div className='flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground'>
              <Spinner className='size-4' />
              Loading metrics…
            </div>
          )}

          {!loading && !apiError && !chartData && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <Activity strokeWidth={2} />
                </EmptyMedia>
                <EmptyTitle>No metrics for this process</EmptyTitle>
                <EmptyDescription>
                  Prometheus has no data for {process.name} on {server.server}.
                  Check that the scrape target labels this server as{' '}
                  <code className='font-mono'>app=&quot;{server.server}&quot;</code>.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {chartData && (
            <div className='space-y-3'>
              <MetricChartCard
                title='CPU'
                description={
                  cpuLast === null ? 'No data in this range.' : formatCpuValue(cpuLast)
                }
                series={toChartSeries(cpuSeries, theme.series.cpu, {
                  filled: true,
                })}
                theme={theme}
                valueFormatter={formatCpuValue}
                yAxisFormatter={formatCpuAxis}
                yAxisMax={100}
              />

              <MetricChartCard
                title='Memory'
                description={memoryDescription}
                series={memoryChartSeries}
                theme={theme}
                valueFormatter={memoryValueFormatter}
                yAxisFormatter={memoryAxisFormatter}
                yAxisMax={memoryPercentTotal === null ? undefined : 100}
              />

              <MetricChartCard
                title='Status'
                description={
                  statusLast === null
                    ? 'No data in this range.'
                    : statusLabel(statusLast)
                }
                series={toChartSeries(statusSeries, theme.series.status, {
                  stepped: true,
                  mapValue: (value) => statusLabel(value),
                })}
                theme={theme}
                valueFormatter={(value) => String(value)}
                yAxisCategories={STATUS_CATEGORIES}
              />

              <MetricChartCard
                title='Restarts'
                description={
                  restartsLast === null && unstableLast === null
                    ? 'No data in this range.'
                    : `${restartsLast ?? 0} total · ${unstableLast ?? 0} unstable`
                }
                series={[
                  ...toChartSeries(restartsSeries, theme.series.restarts, {
                    stepped: true,
                    name: 'Total',
                  }),
                  ...toChartSeries(unstableSeries, theme.series.unstable, {
                    stepped: true,
                    name: 'Unstable',
                  }),
                ]}
                theme={theme}
                valueFormatter={formatRestartsValue}
                yAxisFormatter={formatRestartsAxis}
              />

              <MetricChartCard
                title='Uptime'
                description={
                  uptimeLast === null
                    ? 'No data in this range.'
                    : formatUptimeValue(uptimeLast)
                }
                series={toChartSeries(uptimeSeries, theme.series.uptime, {
                  filled: true,
                })}
                theme={theme}
                valueFormatter={formatUptimeValue}
                yAxisFormatter={formatUptimeAxis}
              />

              <Card size='sm'>
                <CardHeader className='pb-1'>
                  <CardTitle>Started at</CardTitle>
                  <CardDescription>
                    {startedAt === null
                      ? 'No data in this range.'
                      : new Date(startedAt * 1000).toLocaleString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
