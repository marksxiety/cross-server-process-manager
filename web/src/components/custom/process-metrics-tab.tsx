import { useMemo } from 'react'
import { Activity } from 'lucide-react'
import { isPrometheusConfigured } from '@/api/services/prometheus.service'
import { MetricBasisSwitch } from '@/components/custom/metric-basis-switch'
import {
  LineChartCard,
  StatusTimelineCard,
} from '@/components/custom/charts'
import { PageLoader } from '@/components/custom/page-loader'
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
import { useMetricChartSeries } from '@/hooks/use-metric-chart-series'
import { useProcessMetrics } from '@/hooks/use-process-metrics'
import { useStatusTimeline } from '@/hooks/use-status-timeline'
import { formatBytes, formatPercent, memorySharePercent } from '@/lib/format'
import {
  buildProcessStyleMap,
  maxNumericValue,
  niceCpuProcessMax,
  nicePercentMax,
  percentAxisFormatter,
  processStyleFor,
} from '@/lib/metric-chart'
import {
  combineStatus,
  metricDescription,
  metricError,
} from '@/lib/metric-status'
import {
  isMetricsInitialLoad,
  metricsLoadingDescription,
} from '@/lib/metrics-loading'
import {
  PROCESS_METRICS,
  formatMetricAxisValue,
  formatMetricValue,
  formatSeriesLabel,
  lastValue,
  normalizeCpu,
  normalizeMetricsRefreshMs,
  seriesIdentity,
} from '@/lib/prometheus'
import { statusLabelFromCode } from '@/lib/status-catalog'
import { useMetricsStore } from '@/stores/metrics.store'
import type { ApiError } from '@/types/api'
import type { LoadStatus } from '@/types/dashboard'
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
  cpuCores: number | null
  overviewStatus: LoadStatus
  active: boolean
}

function metricValueFormatter(metric: ProcessMetricName) {
  return (value: number | string) => formatMetricValue(metric, Number(value))
}

function metricAxisFormatter(metric: ProcessMetricName) {
  return (value: number) => formatMetricAxisValue(metric, value)
}

const formatCpuValue = metricValueFormatter('pm2_cpu')
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
  cpuCores,
  overviewStatus,
  active,
}: ProcessMetricsTabProps) {
  const range = useMetricsStore((state) => state.range)
  const setRange = useMetricsStore((state) => state.setRange)
  const refreshMs = useMetricsStore((state) => state.refreshMs)
  const setRefreshMs = useMetricsStore((state) => state.setRefreshMs)
  const cpuBasis = useMetricsStore((state) => state.cpuBasis)
  const setCpuBasis = useMetricsStore((state) => state.setCpuBasis)
  const memoryBasis = useMetricsStore((state) => state.memoryBasis)
  const setMemoryBasis = useMetricsStore((state) => state.setMemoryBasis)
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
  const toChartSeries = useMetricChartSeries(metrics)
  const styleMap = useMemo(
    () => buildProcessStyleMap(Object.values(metrics.data), theme.palette),
    [metrics.data, theme.palette],
  )
  const fallbackStyle = { color: theme.palette[0] ?? '#155dfc' }
  const colorFor = (series: PrometheusSeries) =>
    processStyleFor(series, styleMap, fallbackStyle).color

  const cpuSeries = metrics.data.pm2_cpu
  const memorySeries = metrics.data.pm2_memory
  const statusSeries = metrics.data.pm2_status
  const timelineProcesses = (statusSeries ?? []).map((series) => ({
    label: formatSeriesLabel(series),
    identity: seriesIdentity(series.metric),
  }))
  const timelineData = useStatusTimeline(
    metrics,
    statusSeries ?? [],
    timelineProcesses,
  )
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

  const cpuBasisIsServer = cpuBasis === 'server'
  const cpuServerPending =
    overviewStatus === 'loading' || overviewStatus === 'idle'
  const cpuServerReady =
    overviewStatus === 'success' && cpuCores !== null && cpuCores > 0
  const cpuCardStatus: LoadStatus = cpuBasisIsServer
    ? cpuServerPending
      ? 'loading'
      : cpuServerReady
        ? metrics.status.pm2_cpu
        : 'error'
    : metrics.status.pm2_cpu
  const cpuCardError: ApiError | null =
    cpuBasisIsServer && !cpuServerPending && !cpuServerReady
      ? {
          code: 'SERVER_CPU_UNAVAILABLE',
          message:
            'Server CPU basis requires the agent CPU core count. Update the agent or switch to PROCESS.',
          status: 0,
        }
      : metricError(metrics.errors, 'pm2_cpu')
  const cpuChartSeries = cpuBasisIsServer
    ? cpuServerReady
      ? toChartSeries(cpuSeries, {
          color: colorFor,
          filled: true,
          valueMapper: (value) => normalizeCpu(value, cpuCores),
        })
      : []
    : toChartSeries(cpuSeries, {
        color: colorFor,
        filled: true,
      })
  const cpuDisplayLast =
    cpuLast === null || (cpuBasisIsServer && !cpuServerReady)
      ? null
      : cpuBasisIsServer
        ? normalizeCpu(cpuLast, cpuCores)
        : cpuLast
  const cpuDescriptionValue =
    cpuSeries?.length === 0 || cpuDisplayLast === null
      ? null
      : `${formatPercent(cpuDisplayLast, 1)} ${
          cpuBasisIsServer ? 'of server CPU' : 'CPU (PM2)'
        }`
  const cpuDescription = metricDescription(
    cpuCardStatus,
    cpuDescriptionValue,
  )
  const cpuAxisMax = cpuBasisIsServer
    ? nicePercentMax(maxNumericValue(cpuChartSeries), 1)
    : niceCpuProcessMax(maxNumericValue(cpuChartSeries))
  const cpuAxisFormatter = percentAxisFormatter(cpuAxisMax)

  const memoryBasisIsServer = memoryBasis === 'server'
  const memoryServerPending =
    overviewStatus === 'loading' || overviewStatus === 'idle'
  const memoryServerReady =
    overviewStatus === 'success' &&
    totalMemoryBytes !== null &&
    totalMemoryBytes > 0
  const memoryCardStatus: LoadStatus = memoryBasisIsServer
    ? memoryServerPending
      ? 'loading'
      : memoryServerReady
        ? metrics.status.pm2_memory
        : 'error'
    : metrics.status.pm2_memory
  const memoryCardError: ApiError | null =
    memoryBasisIsServer && !memoryServerPending && !memoryServerReady
      ? {
          code: 'SERVER_MEMORY_UNAVAILABLE',
          message:
            'Host RAM total is unavailable. Switch to PROCESS to see memory in MB.',
          status: 0,
        }
      : metricError(metrics.errors, 'pm2_memory')
  const memoryLastPercent =
    memoryServerReady && memoryLast !== null
      ? memorySharePercent(memoryLast, totalMemoryBytes)
      : null
  const memoryChartSeries = memoryBasisIsServer
    ? memoryServerReady
      ? toChartSeries(memorySeries, {
          color: colorFor,
          filled: true,
          valueMapper: (value) =>
            memorySharePercent(value, totalMemoryBytes) ?? 0,
        })
      : []
    : toChartSeries(memorySeries, {
        color: colorFor,
        filled: true,
      })
  const memoryDescriptionValue =
    memorySeries?.length === 0 || memoryLast === null
      ? null
      : memoryBasisIsServer
        ? memoryLastPercent === null
          ? null
          : `${formatPercent(memoryLastPercent, 1)} of host RAM · ${formatBytes(
              memoryLast,
            )}`
        : formatBytes(memoryLast)
  const memoryDescription = metricDescription(
    memoryCardStatus,
    memoryDescriptionValue,
  )
  const memoryPercentMax = memoryBasisIsServer
    ? nicePercentMax(maxNumericValue(memoryChartSeries), 1)
    : null
  const memoryValueFormatter = (value: number | string) => {
    if (!memoryBasisIsServer || totalMemoryBytes === null) {
      return formatMemoryValue(value)
    }

    const percent = Number(value)
    return `${formatPercent(percent, 1)} (${formatBytes(
      (percent / 100) * totalMemoryBytes,
    )})`
  }
  const memoryAxisFormatter = memoryBasisIsServer
    ? percentAxisFormatter(memoryPercentMax ?? 100)
    : formatMemoryAxis
  const memoryAxisMax = memoryBasisIsServer
    ? (memoryPercentMax ?? undefined)
    : undefined

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
  // The page loader only covers the very first load. Once the tab has loaded it
  // stays mounted, so an auto refresh is reported by the charts themselves.
  const isPageLoaded = metrics.hasLoaded
  const showInitialLoader =
    !isPageLoaded &&
    isMetricsInitialLoad({
      enabled: configured && active,
      status: metrics.status,
      errors: metrics.errors,
      data: metrics.data,
    })

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
          isRefreshing={metrics.isRefreshing}
          onRangeChange={setRange}
          onRefreshMsChange={setRefreshMs}
          onRefresh={metrics.refresh}
          layout='stacked'
          disabled={showInitialLoader}
        />
      </div>

      <ScrollArea className='min-h-0 flex-1'>
        <div className='px-3 py-3'>
          {showInitialLoader ? (
            <PageLoader
              className='min-h-[40vh]'
              title='Loading metrics…'
              description={metricsLoadingDescription(
                `${process.name} on ${server.server}`,
              )}
            />
          ) : showEmptyState ? (
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
              <LineChartCard
                title='CPU'
                description={cpuDescription}
                series={cpuChartSeries}
                theme={theme}
                valueFormatter={formatCpuValue}
                yAxisFormatter={cpuAxisFormatter}
                yAxisMax={cpuAxisMax}
                status={cpuCardStatus}
                error={cpuCardError}
                onRetry={metrics.refresh}
                action={
                  <MetricBasisSwitch
                    label='CPU basis'
                    value={cpuBasis}
                    onChange={setCpuBasis}
                  />
                }
              />

              <LineChartCard
                title='Memory'
                description={memoryDescription}
                series={memoryChartSeries}
                theme={theme}
                valueFormatter={memoryValueFormatter}
                yAxisFormatter={memoryAxisFormatter}
                yAxisMax={memoryAxisMax}
                status={memoryCardStatus}
                error={memoryCardError}
                onRetry={metrics.refresh}
                action={
                  <MetricBasisSwitch
                    label='Memory basis'
                    value={memoryBasis}
                    onChange={setMemoryBasis}
                  />
                }
              />

              <StatusTimelineCard
                title='Status'
                description={metricDescription(
                  metrics.status.pm2_status,
                  statusLast === null
                    ? null
                    : statusLabelFromCode(statusLast),
                )}
                data={timelineData}
                theme={theme}
                status={metrics.status.pm2_status}
                error={metricError(metrics.errors, 'pm2_status')}
                onRetry={metrics.refresh}
              />

              <LineChartCard
                title='Restarts'
                description={metricDescription(
                  restartsStatus,
                  restartsLast === null && unstableLast === null
                    ? null
                    : `${restartsLast ?? 0} total · ${unstableLast ?? 0} unstable`,
                )}
                series={[
                  ...toChartSeries(restartsSeries, {
                    color: theme.series.restarts,
                    stepped: true,
                    label: () => 'Total',
                  }),
                  ...toChartSeries(unstableSeries, {
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

              <LineChartCard
                title='Uptime'
                description={metricDescription(
                  metrics.status.pm2_uptime,
                  uptimeLast === null ? null : formatUptimeValue(uptimeLast),
                )}
                series={toChartSeries(uptimeSeries, {
                  color: colorFor,
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
