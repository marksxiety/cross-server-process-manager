import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Activity, ArrowLeft, Search, ServerOff } from 'lucide-react'
import { isPrometheusConfigured } from '@/api/services/prometheus.service'
import { ErrorAlert } from '@/components/custom/error-alert'
import { MetricBasisSwitch } from '@/components/custom/metric-basis-switch'
import { MetricChartCard } from '@/components/custom/metric-chart-card'
import { MetricsToolbar } from '@/components/custom/metrics-toolbar'
import { ServerUsageDonut } from '@/components/custom/server-usage-donut'
import { Button } from '@/components/ui/button'
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
import {
  maxNumericValue,
  niceCpuProcessMax,
  nicePercentMax,
  percentAxisFormatter,
  toMetricChartSeries,
} from '@/lib/metric-chart'
import {
  metricDescription,
  metricError,
} from '@/lib/metric-status'
import {
  PROCESS_METRICS,
  countByStatus,
  filterSeries,
  formatMetricAxisValue,
  formatMetricValue,
  formatSeriesLabel,
  normalizeCpu,
  normalizeMetricsRefreshMs,
  sumLastValues,
} from '@/lib/prometheus'
import {
  STATUS_CATALOG,
  STATUS_CHART_CATEGORIES,
  STATUS_ORDER,
  statusLabelFromCode,
} from '@/lib/status-catalog'
import {
  cpuUsageShares,
  memoryUsageShares,
  resolveUsageStatus,
} from '@/lib/server-usage'
import { useDashboardStore } from '@/stores/dashboard.store'
import { useMetricsStore } from '@/stores/metrics.store'
import type { ApiError } from '@/types/api'
import type { LoadStatus } from '@/types/dashboard'
import type {
  ProcessMetricName,
  PrometheusSeries,
} from '@/types/prometheus'

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
const STATUS_SUMMARY_ORDER = STATUS_ORDER.map(
  (status) => STATUS_CATALOG[status].label,
)

function statusSummary(counts: Record<string, number>): string | null {
  const parts = STATUS_SUMMARY_ORDER
    .filter((label) => (counts[label] ?? 0) > 0)
    .map((label) => `${counts[label]} ${label}`)

  return parts.length > 0 ? parts.join(' · ') : null
}

function processCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'process' : 'processes'}`
}

export function ServerMetrics() {
  const { serverName = '' } = useParams<{ serverName: string }>()
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

  const servers = useDashboardStore((state) => state.servers)
  const serversStatus = useDashboardStore((state) => state.serversStatus)
  const registryError = useDashboardStore((state) => state.requestError)
  const processesByServer = useDashboardStore((state) => state.processesByServer)
  const load = useDashboardStore((state) => state.load)
  const refreshServer = useDashboardStore((state) => state.refreshServer)

  const [namespace, setNamespace] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    void load()
  }, [load])

  const server = servers.find((entry) => entry.server === serverName)
  const serverEntry = server ? processesByServer[server.server] : undefined
  const overviewStatus = serverEntry?.status ?? 'idle'
  const cpuCores = serverEntry?.overview?.cpu.cores ?? null
  const totalMemoryBytes = serverEntry?.overview?.memory.totalBytes ?? null

  const metrics = useServerMetrics({
    serverName,
    range,
    refreshMs: activeRefreshMs,
    enabled: configured && serverName !== '',
  })

  const lastOverviewRefresh = useRef<number | null>(null)

  useEffect(() => {
    lastOverviewRefresh.current = null
  }, [serverName])

  useEffect(() => {
    if (!server || metrics.lastUpdated === null) return
    if (lastOverviewRefresh.current === metrics.lastUpdated) return

    const isInitial = lastOverviewRefresh.current === null
    lastOverviewRefresh.current = metrics.lastUpdated

    if (isInitial) return
    void refreshServer(server)
  }, [metrics.lastUpdated, refreshServer, server])

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
    uptimeSeries,
  ]) {
    for (const series of seriesList) visibleLabels.add(formatSeriesLabel(series))
  }
  const visibleProcessCount = visibleLabels.size

  const overview = serverEntry?.overview ?? null
  const cpuTotalRaw = sumLastValues(cpuSeries)
  const memoryTotalRaw = sumLastValues(memorySeries)
  const statusCounts = countByStatus(statusSeries)
  const cpuShares = cpuUsageShares(
    cpuTotalRaw,
    overview?.cpu.usagePercent ?? null,
    overview?.cpu.cores ?? null,
  )
  const memoryShares = memoryUsageShares(
    memoryTotalRaw,
    overview?.memory.usedBytes ?? null,
    overview?.memory.totalBytes ?? null,
  )
  const cpuUsageStatus = resolveUsageStatus(
    overviewStatus,
    metrics.status.pm2_cpu,
    cpuShares,
  )
  const memoryUsageStatus = resolveUsageStatus(
    overviewStatus,
    metrics.status.pm2_memory,
    memoryShares,
  )

  const metricsLoading = metrics.isRefreshing && visibleProcessCount === 0
  const hasError = Object.keys(metrics.errors).length > 0
  const allSettled = PROCESS_METRICS.every(
    (metric) =>
      metrics.status[metric] === 'success' || metrics.status[metric] === 'error',
  )
  const showEmptyState =
    allSettled && visibleProcessCount === 0 && !hasError

  const cpuServerPending =
    overviewStatus === 'loading' || overviewStatus === 'idle'
  const cpuServerReady =
    overviewStatus === 'success' && cpuCores !== null && cpuCores > 0
  const cpuBasisIsServer = cpuBasis === 'server'
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
      ? toMetricChartSeries(cpuSeries, {
          color: colorFor,
          filled: true,
          label: formatSeriesLabel,
          valueMapper: (value) => normalizeCpu(value, cpuCores),
        })
      : []
    : toMetricChartSeries(cpuSeries, {
        color: colorFor,
        filled: true,
        label: formatSeriesLabel,
      })
  const cpuDisplayTotal =
    cpuTotalRaw === null || (cpuBasisIsServer && !cpuServerReady)
      ? null
      : cpuBasisIsServer
        ? normalizeCpu(cpuTotalRaw, cpuCores)
        : cpuTotalRaw
  const cpuDescriptionValue =
    cpuSeries.length === 0 || cpuDisplayTotal === null
      ? null
      : `${processCountLabel(cpuSeries.length)} · ${formatPercent(
          cpuDisplayTotal,
          1,
        )} ${cpuBasisIsServer ? 'of server CPU' : 'CPU (PM2)'}`
  const cpuDescription = metricDescription(
    cpuCardStatus,
    cpuDescriptionValue,
  )
  const cpuAxisMax = cpuBasisIsServer
    ? nicePercentMax(maxNumericValue(cpuChartSeries), 1)
    : niceCpuProcessMax(maxNumericValue(cpuChartSeries))
  const cpuAxisFormatter = percentAxisFormatter(cpuAxisMax)

  const memoryServerPending =
    overviewStatus === 'loading' || overviewStatus === 'idle'
  const memoryServerReady =
    overviewStatus === 'success' &&
    totalMemoryBytes !== null &&
    totalMemoryBytes > 0
  const memoryBasisIsServer = memoryBasis === 'server'
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
  const memoryServerPercent =
    memoryServerReady && memoryTotalRaw !== null
      ? memorySharePercent(memoryTotalRaw, totalMemoryBytes)
      : null
  const memoryChartSeries = memoryBasisIsServer
    ? memoryServerReady
      ? toMetricChartSeries(memorySeries, {
          color: colorFor,
          filled: true,
          label: formatSeriesLabel,
          valueMapper: (value) =>
            memorySharePercent(value, totalMemoryBytes) ?? 0,
        })
      : []
    : toMetricChartSeries(memorySeries, {
        color: colorFor,
        filled: true,
        label: formatSeriesLabel,
      })
  const memoryDescriptionValue =
    memorySeries.length === 0 || memoryTotalRaw === null
      ? null
      : memoryBasisIsServer
        ? memoryServerPercent === null
          ? null
          : `${processCountLabel(memorySeries.length)} · ${formatPercent(
              memoryServerPercent,
              1,
            )} of host RAM (${formatBytes(memoryTotalRaw)})`
        : `${processCountLabel(memorySeries.length)} · ${formatBytes(
            memoryTotalRaw,
          )}`
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
              {server
                ? `${server.host}:${server.port} · Host RAM ${
                    totalMemoryBytes === null
                      ? '—'
                      : formatBytes(totalMemoryBytes)
                  }`
                : 'Loading server details…'}
            </p>
          </div>

          <div className='w-full lg:w-auto lg:shrink-0'>
            <MetricsToolbar
              range={range}
              refreshMs={activeRefreshMs}
              isRefreshing={metrics.isRefreshing}
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

      <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <ServerUsageDonut
          title='CPU'
          theme={theme}
          pm2={cpuShares?.pm2 ?? null}
          other={cpuShares?.other ?? null}
          status={cpuUsageStatus}
        />
        <ServerUsageDonut
          title='Memory'
          theme={theme}
          pm2={memoryShares?.pm2 ?? null}
          other={memoryShares?.other ?? null}
          status={memoryUsageStatus}
        />
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
          description={cpuDescription}
          series={cpuChartSeries}
          theme={theme}
          valueFormatter={formatCpuValue}
          yAxisFormatter={cpuAxisFormatter}
          yAxisMax={cpuAxisMax}
          chartClassName='h-56'
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

        <MetricChartCard
          title='Memory'
          description={memoryDescription}
          series={memoryChartSeries}
          theme={theme}
          valueFormatter={memoryValueFormatter}
          yAxisFormatter={memoryAxisFormatter}
          yAxisMax={memoryAxisMax}
          chartClassName='h-56'
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
            valueMapper: statusLabelFromCode,
          })}
          theme={theme}
          valueFormatter={(value) => String(value)}
          yAxisCategories={STATUS_CHART_CATEGORIES}
          chartClassName='h-56'
          status={metrics.status.pm2_status}
          error={metricError(metrics.errors, 'pm2_status')}
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
      </div>
      )}
    </div>
  )
}
