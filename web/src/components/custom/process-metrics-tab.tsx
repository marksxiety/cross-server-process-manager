import { Activity } from 'lucide-react'
import { isPrometheusConfigured } from '@/api/services/prometheus.service'
import { MetricChartCard } from '@/components/custom/metric-chart-card'
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
import { useChartTheme } from '@/hooks/use-chart-theme'
import { useProcessMetrics } from '@/hooks/use-process-metrics'
import { formatBytes, formatPercent, memorySharePercent } from '@/lib/format'
import { toMetricChartSeries } from '@/lib/metric-chart'
import {
  combineStatus,
  metricDescription,
  metricError,
} from '@/lib/metric-status'
import {
  PM2_STATUS_LABELS,
  PROCESS_METRICS,
  formatMetricAxisValue,
  formatMetricValue,
  lastValue,
  normalizeMetricsRefreshMs,
  statusLabel,
} from '@/lib/prometheus'
import { useMetricsStore } from '@/stores/metrics.store'
import type { MetricsData, ProcessMetricName } from '@/types/prometheus'
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
  const memoryValueDescription =
    memoryLast === null
      ? null
      : memoryLastPercent === null
        ? formatMemoryValue(memoryLast)
        : `${formatPercent(memoryLastPercent, 1)} of host RAM · ${formatBytes(memoryLast)}`
  const memoryChartSeries = toMetricChartSeries(memorySeries, {
    color: theme.series.memory,
    filled: true,
    valueMapper: (value) =>
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

  const restartsStatus = combineStatus(
    metrics.status.pm2_restarts_total,
    metrics.status.pm2_unstable_restarts_total,
  )
  const restartsError =
    metricError(metrics.errors, 'pm2_restarts_total') ??
    metricError(metrics.errors, 'pm2_unstable_restarts_total')
  const hasError = Object.keys(metrics.errors).length > 0
  const allSettled = PROCESS_METRICS.every(
    (metric) =>
      metrics.status[metric] === 'success' || metrics.status[metric] === 'error',
  )
  const showEmptyState =
    allSettled && !hasAnyData(metrics.data) && !hasError

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
      <div className='shrink-0 px-3 pt-3'>
        <MetricsToolbar
          range={range}
          refreshMs={activeRefreshMs}
          lastUpdated={metrics.lastUpdated}
          isRefreshing={metrics.isRefreshing}
          hasError={hasError}
          onRangeChange={setRange}
          onRefreshMsChange={setRefreshMs}
          onRefresh={metrics.refresh}
        />
      </div>

      <ScrollArea className='min-h-0 flex-1'>
        <div className='px-3 py-3'>
          {showEmptyState ? (
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
          ) : (
            <div className='space-y-3'>
              <MetricChartCard
                title='CPU'
                description={metricDescription(
                  metrics.status.pm2_cpu,
                  cpuLast === null ? null : formatCpuValue(cpuLast),
                )}
                series={toMetricChartSeries(cpuSeries, {
                  color: theme.series.cpu,
                  filled: true,
                })}
                theme={theme}
                valueFormatter={formatCpuValue}
                yAxisFormatter={formatCpuAxis}
                yAxisMax={100}
                status={metrics.status.pm2_cpu}
                error={metricError(metrics.errors, 'pm2_cpu')}
                onRetry={metrics.refresh}
              />

              <MetricChartCard
                title='Memory'
                description={metricDescription(
                  metrics.status.pm2_memory,
                  memoryValueDescription,
                )}
                series={memoryChartSeries}
                theme={theme}
                valueFormatter={memoryValueFormatter}
                yAxisFormatter={memoryAxisFormatter}
                yAxisMax={memoryPercentTotal === null ? undefined : 100}
                status={metrics.status.pm2_memory}
                error={metricError(metrics.errors, 'pm2_memory')}
                onRetry={metrics.refresh}
              />

              <MetricChartCard
                title='Status'
                description={metricDescription(
                  metrics.status.pm2_status,
                  statusLast === null ? null : statusLabel(statusLast),
                )}
                series={toMetricChartSeries(statusSeries, {
                  color: theme.series.status,
                  stepped: true,
                  valueMapper: statusLabel,
                })}
                theme={theme}
                valueFormatter={(value) => String(value)}
                yAxisCategories={STATUS_CATEGORIES}
                status={metrics.status.pm2_status}
                error={metricError(metrics.errors, 'pm2_status')}
                onRetry={metrics.refresh}
              />

              <MetricChartCard
                title='Restarts'
                description={metricDescription(
                  restartsStatus,
                  restartsLast === null && unstableLast === null
                    ? null
                    : `${restartsLast ?? 0} total · ${unstableLast ?? 0} unstable`,
                )}
                series={[
                  ...toMetricChartSeries(restartsSeries, {
                    color: theme.series.restarts,
                    stepped: true,
                    label: () => 'Total',
                  }),
                  ...toMetricChartSeries(unstableSeries, {
                    color: theme.series.unstable,
                    stepped: true,
                    label: () => 'Unstable',
                  }),
                ]}
                theme={theme}
                valueFormatter={formatRestartsValue}
                yAxisFormatter={formatRestartsAxis}
                status={restartsStatus}
                error={restartsError}
                onRetry={metrics.refresh}
              />

              <MetricChartCard
                title='Uptime'
                description={metricDescription(
                  metrics.status.pm2_uptime,
                  uptimeLast === null ? null : formatUptimeValue(uptimeLast),
                )}
                series={toMetricChartSeries(uptimeSeries, {
                  color: theme.series.uptime,
                  filled: true,
                })}
                theme={theme}
                valueFormatter={formatUptimeValue}
                yAxisFormatter={formatUptimeAxis}
                status={metrics.status.pm2_uptime}
                error={metricError(metrics.errors, 'pm2_uptime')}
                onRetry={metrics.refresh}
              />

              <Card size='sm'>
                <CardHeader className='pb-1'>
                  <CardTitle>Started at</CardTitle>
                  <CardDescription>
                    {metricDescription(
                      metrics.status.pm2_start_time_seconds,
                      startedAt === null
                        ? null
                        : new Date(startedAt * 1000).toLocaleString(),
                    )}
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
