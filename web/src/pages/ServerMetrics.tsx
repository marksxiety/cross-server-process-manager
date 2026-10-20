import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Activity, ArrowLeft, Search, ServerOff } from 'lucide-react'
import { isPrometheusConfigured } from '@/api/services/prometheus.service'
import { ErrorAlert } from '@/components/custom/error-alert'
import { MetricChartCard } from '@/components/custom/metric-chart-card'
import { MetricsToolbar } from '@/components/custom/metrics-toolbar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useChartTheme } from '@/hooks/use-chart-theme'
import { useServerMetrics } from '@/hooks/use-server-metrics'
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
  countByStatus,
  filterSeries,
  formatMetricAxisValue,
  formatMetricValue,
  formatSeriesLabel,
  normalizeMetricsRefreshMs,
  statusLabel,
  sumLastValues,
} from '@/lib/prometheus'
import { useDashboardStore } from '@/stores/dashboard.store'
import { useMetricsStore } from '@/stores/metrics.store'
import type { ProcessMetricName, PrometheusSeries } from '@/types/prometheus'

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

function statusSummary(counts: Record<string, number>): string | null {
  const order = [
    'online',
    'launching',
    'stopping',
    'waiting restart',
    'stopped',
    'errored',
    'one-launch-status',
    'unknown',
  ]
  const parts = order
    .filter((label) => (counts[label] ?? 0) > 0)
    .map((label) => `${counts[label]} ${label}`)

  return parts.length > 0 ? parts.join(' · ') : null
}

function processCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'process' : 'processes'}`
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-md bg-muted/40 px-3 py-2'>
      <p className='text-[11px] text-muted-foreground'>{label}</p>
      <p className='mt-0.5 text-sm font-medium'>{value}</p>
    </div>
  )
}

export function ServerMetrics() {
  const { serverName = '' } = useParams<{ serverName: string }>()
  const range = useMetricsStore((state) => state.range)
  const setRange = useMetricsStore((state) => state.setRange)
  const refreshMs = useMetricsStore((state) => state.refreshMs)
  const setRefreshMs = useMetricsStore((state) => state.setRefreshMs)
  const theme = useChartTheme()
  const configured = isPrometheusConfigured()
  const activeRefreshMs = normalizeMetricsRefreshMs(refreshMs)

  const servers = useDashboardStore((state) => state.servers)
  const serversStatus = useDashboardStore((state) => state.serversStatus)
  const registryError = useDashboardStore((state) => state.requestError)
  const processesByServer = useDashboardStore((state) => state.processesByServer)
  const load = useDashboardStore((state) => state.load)

  const [namespace, setNamespace] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    void load()
  }, [load])

  const server = servers.find((entry) => entry.server === serverName)
  const serverEntry = server ? processesByServer[server.server] : undefined
  const totalMemoryBytes = serverEntry?.overview?.memory.totalBytes ?? null

  const metrics = useServerMetrics({
    serverName,
    range,
    refreshMs: activeRefreshMs,
    enabled: configured && serverName !== '',
  })

  const namespaces = useMemo(() => {
    const values = new Set<string>()

    for (const seriesList of Object.values(metrics.data)) {
      for (const series of seriesList ?? []) {
        values.add(series.metric.namespace ?? 'default')
      }
    }

    return [...values].sort()
  }, [metrics.data])

  const activeNamespace =
    namespace !== 'all' && namespaces.includes(namespace) ? namespace : 'all'
  const query = searchQuery.trim().toLowerCase()

  const filterMetric = (seriesList: PrometheusSeries[] | undefined) =>
    filterSeries(seriesList ?? [], {
      namespace: activeNamespace === 'all' ? undefined : activeNamespace,
      query,
    })

  const cpuSeries = filterMetric(metrics.data.pm2_cpu)
  const memorySeries = filterMetric(metrics.data.pm2_memory)
  const statusSeries = filterMetric(metrics.data.pm2_status)
  const restartsSeries = filterMetric(metrics.data.pm2_restarts_total)
  const unstableSeries = filterMetric(
    metrics.data.pm2_unstable_restarts_total,
  )
  const uptimeSeries = filterMetric(metrics.data.pm2_uptime)

  const colorLabels = new Set<string>()
  for (const seriesList of Object.values(metrics.data)) {
    for (const series of filterSeries(seriesList ?? [], {
      namespace: activeNamespace === 'all' ? undefined : activeNamespace,
      query,
    })) {
      colorLabels.add(formatSeriesLabel(series))
    }
  }
  const colorMap = new Map<string, string>()
  ;[...colorLabels].sort().forEach((label, index) => {
    colorMap.set(label, theme.palette[index % theme.palette.length])
  })

  const colorFor = (series: PrometheusSeries) =>
    colorMap.get(formatSeriesLabel(series)) ?? theme.palette[0]

  const visibleLabels = new Set<string>()
  for (const seriesList of [
    cpuSeries,
    memorySeries,
    statusSeries,
    restartsSeries,
    uptimeSeries,
  ]) {
    for (const series of seriesList) visibleLabels.add(formatSeriesLabel(series))
  }
  const visibleProcessCount = visibleLabels.size

  const cpuTotal = sumLastValues(cpuSeries)
  const memoryTotal = sumLastValues(memorySeries)
  const memoryPercent =
    memoryTotal === null || totalMemoryBytes === null
      ? null
      : memorySharePercent(memoryTotal, totalMemoryBytes)
  const statusCounts = countByStatus(statusSeries)
  const restartsTotal = sumLastValues(restartsSeries)
  const unstableTotal = sumLastValues(unstableSeries)

  const metricsLoading = metrics.isRefreshing && visibleProcessCount === 0
  const hasError = Object.keys(metrics.errors).length > 0
  const allSettled = PROCESS_METRICS.every(
    (metric) =>
      metrics.status[metric] === 'success' || metrics.status[metric] === 'error',
  )
  const showEmptyState =
    allSettled && visibleProcessCount === 0 && !hasError
  const restartsStatus = combineStatus(
    metrics.status.pm2_restarts_total,
    metrics.status.pm2_unstable_restarts_total,
  )
  const restartsError =
    metricError(metrics.errors, 'pm2_restarts_total') ??
    metricError(metrics.errors, 'pm2_unstable_restarts_total')

  const memoryValueDescription =
    memoryTotal === null
      ? null
      : memoryPercent === null
        ? `${processCountLabel(memorySeries.length)} · ${formatBytes(memoryTotal)} (host total pending)`
        : `${processCountLabel(memorySeries.length)} · ${formatPercent(memoryPercent, 1)} of host RAM (${formatBytes(memoryTotal)})`

  const memoryChartSeries = toMetricChartSeries(memorySeries, {
    color: colorFor,
    filled: true,
    label: formatSeriesLabel,
    valueMapper: (value) =>
      totalMemoryBytes === null
        ? value
        : (memorySharePercent(value, totalMemoryBytes) ?? 0),
  })
  const memoryValueFormatter = (value: number | string) => {
    if (totalMemoryBytes === null) return formatMemoryValue(value)

    const percent = Number(value)
    return `${formatPercent(percent, 1)} (${formatBytes(
      (percent / 100) * totalMemoryBytes,
    )})`
  }
  const memoryAxisFormatter = (value: number) => {
    if (totalMemoryBytes === null) return formatMemoryAxis(value)
    return `${Math.round(value)}%`
  }

  const namespaceItems = useMemo(
    () => [
      { value: 'all', label: 'All namespaces' },
      ...namespaces.map((entry) => ({ value: entry, label: entry })),
    ],
    [namespaces],
  )

  if (!configured) {
    return (
      <Empty className='my-10'>
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

  if (serversStatus === 'success' && !server) {
    return (
      <Empty className='my-10'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <ServerOff strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>Server not found</EmptyTitle>
          <EmptyDescription>
            No registered server named “{serverName}”.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link to='/' />}>Back to dashboard</Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className='min-w-0'>
      <div className='mb-4 space-y-2'>
        <Link
          to='/'
          className='inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground'
        >
          <ArrowLeft className='size-3.5' strokeWidth={2} />
          Dashboard
        </Link>

        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='min-w-0'>
            <h1 className='text-lg font-semibold tracking-tight sm:text-xl'>
              Server metrics · {serverName}
            </h1>
            <p className='text-xs text-muted-foreground'>
              {server ? `${server.host}:${server.port}` : 'Loading server details…'}
            </p>
          </div>

          <div className='w-full lg:w-auto lg:shrink-0'>
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
        </div>
      </div>

      {registryError && <ErrorAlert error={registryError} className='mb-3' />}

      <div className='mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3'>
        <p className='shrink-0 text-xs font-medium text-muted-foreground'>
          {metricsLoading ? 'Loading…' : processCountLabel(visibleProcessCount)}
        </p>
        <Separator className='hidden flex-1 sm:block' />
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
          <Select
            items={namespaceItems}
            value={activeNamespace}
            onValueChange={(value) => setNamespace(value || 'all')}
          >
            <SelectTrigger
              size='sm'
              className='w-44'
              aria-label='Namespace filter'
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {namespaceItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className='relative w-full sm:w-56'>
            <Search
              className='pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground'
              strokeWidth={2}
            />
            <Input
              size='xs'
              className='pl-7'
              value={searchQuery}
              placeholder='Search processes…'
              aria-label='Search processes by name or namespace'
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>
      </div>

      {showEmptyState ? (
        <Empty className='mt-4'>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Activity strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>No metrics for this server</EmptyTitle>
            <EmptyDescription>
              Prometheus has no data for {serverName}. Check that the scrape
              target labels this server as{' '}
              <code className='font-mono'>app=&quot;{serverName}&quot;</code>.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
      <div className='mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2'>
        <MetricChartCard
          title='CPU'
          description={metricDescription(
            metrics.status.pm2_cpu,
            cpuTotal === null
              ? null
              : `${processCountLabel(cpuSeries.length)} · total ${formatPercent(cpuTotal, 1)}`,
          )}
          series={toMetricChartSeries(cpuSeries, {
            color: colorFor,
            filled: true,
            label: formatSeriesLabel,
          })}
          theme={theme}
          valueFormatter={formatCpuValue}
          yAxisFormatter={formatCpuAxis}
          yAxisMax={100}
          chartClassName='h-56'
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
          yAxisMax={totalMemoryBytes === null ? undefined : 100}
          chartClassName='h-56'
          status={metrics.status.pm2_memory}
          error={metricError(metrics.errors, 'pm2_memory')}
          onRetry={metrics.refresh}
        />

        <MetricChartCard
          title='Status'
          description={metricDescription(
            metrics.status.pm2_status,
            statusSummary(statusCounts),
          )}
          series={toMetricChartSeries(statusSeries, {
            color: colorFor,
            stepped: true,
            label: formatSeriesLabel,
            valueMapper: statusLabel,
          })}
          theme={theme}
          valueFormatter={(value) => String(value)}
          yAxisCategories={STATUS_CATEGORIES}
          chartClassName='h-56'
          status={metrics.status.pm2_status}
          error={metricError(metrics.errors, 'pm2_status')}
          onRetry={metrics.refresh}
        />

        <MetricChartCard
          title='Restarts'
          description={metricDescription(
            restartsStatus,
            restartsSeries.length === 0 && unstableSeries.length === 0
              ? null
              : `${processCountLabel(restartsSeries.length)} · ${
                  restartsTotal ?? 0
                } total · ${unstableTotal ?? 0} unstable`,
          )}
          series={[
            ...toMetricChartSeries(restartsSeries, {
              color: colorFor,
              stepped: true,
              label: (series) => `${formatSeriesLabel(series)} · total`,
            }),
            ...toMetricChartSeries(unstableSeries, {
              color: theme.series.unstable,
              stepped: true,
              dashed: true,
              label: (series) => `${formatSeriesLabel(series)} · unstable`,
            }),
          ]}
          theme={theme}
          valueFormatter={formatRestartsValue}
          yAxisFormatter={formatRestartsAxis}
          chartClassName='h-56'
          status={restartsStatus}
          error={restartsError}
          onRetry={metrics.refresh}
        />

        <MetricChartCard
          title='Uptime'
          description={metricDescription(
            metrics.status.pm2_uptime,
            uptimeSeries.length === 0
              ? null
              : processCountLabel(uptimeSeries.length),
          )}
          series={toMetricChartSeries(uptimeSeries, {
            color: colorFor,
            filled: true,
            label: formatSeriesLabel,
          })}
          theme={theme}
          valueFormatter={formatUptimeValue}
          yAxisFormatter={formatUptimeAxis}
          chartClassName='h-56'
          status={metrics.status.pm2_uptime}
          error={metricError(metrics.errors, 'pm2_uptime')}
          onRetry={metrics.refresh}
        />

        <Card size='sm'>
          <CardHeader className='pb-1'>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              {metricsLoading
                ? 'Loading processes…'
                : `${processCountLabel(visibleProcessCount)} · ${namespaces.length} ${
                    namespaces.length === 1 ? 'namespace' : 'namespaces'
                  }`}
            </CardDescription>
          </CardHeader>
          <CardContent className='grid grid-cols-2 gap-2'>
            <SummaryStat
              label='CPU total'
              value={cpuTotal === null ? '—' : formatPercent(cpuTotal, 1)}
            />
            <SummaryStat
              label='Memory total'
              value={
                memoryPercent === null
                  ? memoryTotal === null
                    ? '—'
                    : formatBytes(memoryTotal)
                  : `${formatPercent(memoryPercent, 1)} (${formatBytes(
                      memoryTotal ?? 0,
                    )})`
              }
            />
            <SummaryStat
              label='Host RAM'
              value={
                totalMemoryBytes === null
                  ? '—'
                  : formatBytes(totalMemoryBytes)
              }
            />
            <SummaryStat
              label='Unstable restarts'
              value={
                unstableTotal === null
                  ? '—'
                  : String(Math.trunc(unstableTotal))
              }
            />
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  )
}
