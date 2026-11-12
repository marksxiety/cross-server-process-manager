import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Info, Search, ServerOff } from 'lucide-react'
import {
  isPrometheusConfigured,
  toPrometheusApiError,
} from '@/api/services/prometheus.service'
import {
  LineChartCard,
  StatusTimelineCard,
  UsageTrendCard,
} from '@/components/custom/charts'
import { ErrorAlert } from '@/components/custom/error-alert'
import { LinkButton } from '@/components/custom/link-button'
import { MetricBasisSwitch } from '@/components/custom/metric-basis-switch'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { PageLoader } from '@/components/custom/page-loader'
import { ProcessesSection } from '@/components/custom/processes-section'
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
import { useMetricChartSeries } from '@/hooks/use-metric-chart-series'
import { useMetricsZoom } from '@/hooks/use-metrics-zoom'
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
  countByStatus,
  filterSeries,
  formatMetricAxisValue,
  formatMetricValue,
  formatSeriesName,
  lastValue,
  normalizeCpu,
  seriesIdentity,
  sumLastValues,
} from '@/lib/prometheus'
import {
  STATUS_CATALOG,
  STATUS_ORDER,
} from '@/lib/status-catalog'
import {
  cpuUsageShares,
  memoryUsageShares,
  resolveUsageStatus,
} from '@/lib/server-usage'
import { useDashboardStore } from '@/stores/dashboard.store'
import { useMetricsStore } from '@/stores/metrics.store'
import type { MetricsRangeResult } from '@/hooks/use-metrics-range'
import type { ServerSeriesAvailabilityResult } from '@/hooks/use-server-series-availability'
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
const HOST_PERCENT_AXIS_MAX = 100
const formatHostPercentAxis = percentAxisFormatter(HOST_PERCENT_AXIS_MAX)
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

function missingHostMetricsError(subject: 'CPU' | 'memory'): ApiError {
  return {
    code: `HOST_${subject.toUpperCase()}_METRICS_UNAVAILABLE`,
    message: `Host ${subject} metrics are not in Prometheus. Update xpm-exporter and keep host_* metrics in the scrape.`,
    status: 0,
  }
}

export type ServerMetricsProps = {
  serverName: string
  metrics: MetricsRangeResult
  availability: ServerSeriesAvailabilityResult
}

export function ServerMetrics({
  serverName,
  metrics,
  availability,
}: ServerMetricsProps) {
  const cpuBasis = useMetricsStore((state) => state.cpuBasis)
  const setCpuBasis = useMetricsStore((state) => state.setCpuBasis)
  const memoryBasis = useMetricsStore((state) => state.memoryBasis)
  const setMemoryBasis = useMetricsStore((state) => state.setMemoryBasis)
  const theme = useChartTheme()
  const toChartSeries = useMetricChartSeries(metrics)
  const { selectTimeRange, resetTimeRange } = useMetricsZoom()
  const configured = isPrometheusConfigured()
  const metricsEnabled = configured && serverName !== ''

  const servers = useDashboardStore((state) => state.servers)
  const serversStatus = useDashboardStore((state) => state.serversStatus)
  const registryError = useDashboardStore((state) => state.requestError)
  const processesByServer = useDashboardStore((state) => state.processesByServer)
  const refreshServer = useDashboardStore((state) => state.refreshServer)

  const [namespace, setNamespace] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const server = servers.find((entry) => entry.server === serverName)
  const serverEntry = server ? processesByServer[server.server] : undefined
  const overviewStatus = serverEntry?.status ?? 'idle'

  const hostCpuSeries = metrics.data.host_cpu_usage_percent ?? []
  const hostCpuCoresSeries = metrics.data.host_cpu_cores ?? []
  const hostMemorySeries = metrics.data.host_memory_usage_percent ?? []
  const hostMemoryTotalSeries = metrics.data.host_memory_total_bytes ?? []
  const hostCpuStatus = metrics.status.host_cpu_usage_percent
  const hostCpuCoresStatus = metrics.status.host_cpu_cores
  const hostMemoryStatus = metrics.status.host_memory_usage_percent
  const hostMemoryTotalStatus = metrics.status.host_memory_total_bytes
  const hostCpuMetricsStatus = combineStatus(
    hostCpuStatus,
    hostCpuCoresStatus,
  )
  const hostMemoryMetricsStatus = combineStatus(
    hostMemoryStatus,
    hostMemoryTotalStatus,
  )
  const hostCpuMissing =
    hostCpuStatus === 'success' && hostCpuSeries.length === 0
  const hostCpuCoresMissing =
    hostCpuCoresStatus === 'success' && hostCpuCoresSeries.length === 0
  const hostMemoryMissing =
    hostMemoryStatus === 'success' && hostMemorySeries.length === 0
  const hostMemoryTotalMissing =
    hostMemoryTotalStatus === 'success' && hostMemoryTotalSeries.length === 0
  const hostCpuPercent = lastValue(hostCpuSeries)
  const hostMemoryPercent = lastValue(hostMemorySeries)
  const hostCpuCores = lastValue(hostCpuCoresSeries)
  const hostMemoryTotalBytes = lastValue(hostMemoryTotalSeries)
  const rangeHasData = Object.values(metrics.data).some((seriesList) =>
    seriesList?.some((series) => series.points.length > 0),
  )
  const showMissingHostErrors = rangeHasData
  const hostMemoryUsedBytes =
    hostMemoryPercent === null || hostMemoryTotalBytes === null
      ? null
      : (hostMemoryPercent / 100) * hostMemoryTotalBytes
  const cpuCores = hostCpuCores
  const totalMemoryBytes = hostMemoryTotalBytes
  const hostRamLabel =
    totalMemoryBytes === null ? '—' : formatBytes(totalMemoryBytes)

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

  const serverProcessItems = useMemo(
    () =>
      server && serverEntry?.status === 'success'
        ? serverEntry.processes.map((process) => ({ server, process }))
        : [],
    [server, serverEntry],
  )

  const namespaces = useMemo(() => {
    const values = new Set<string>()

    for (const metric of PROCESS_METRICS) {
      for (const series of metrics.data[metric] ?? []) {
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

  const processIdentities = new Map<string, string>()
  for (const metric of PROCESS_METRICS) {
    for (const series of filterSeries(metrics.data[metric] ?? [], {
      namespace: activeNamespace === 'all' ? undefined : activeNamespace,
      query,
    })) {
      const label = formatSeriesName(series)
      if (!processIdentities.has(label)) {
        processIdentities.set(label, seriesIdentity(series.metric))
      }
    }
  }

  const styleMap = useMemo(
    () =>
      buildProcessStyleMap(
        PROCESS_METRICS.map((metric) => metrics.data[metric]),
        theme.palette,
      ),
    [metrics.data, theme.palette],
  )
  const fallbackStyle = { color: theme.palette[0] ?? '#155dfc' }
  const styleFor = (series: PrometheusSeries) =>
    processStyleFor(series, styleMap, fallbackStyle)
  const chartStyle = (seriesList: PrometheusSeries[]) => ({
    color: (series: PrometheusSeries) => styleFor(series).color,
    ...(seriesList.length > 1
      ? {
          dashPattern: (series: PrometheusSeries) =>
            styleFor(series).dashPattern,
        }
      : {}),
  })

  const visibleLabels = new Set<string>()
  for (const seriesList of [
    cpuSeries,
    memorySeries,
    statusSeries,
    uptimeSeries,
  ]) {
    for (const series of seriesList) visibleLabels.add(formatSeriesName(series))
  }
  const visibleProcessCount = visibleLabels.size

  const statusLabels = new Set(statusSeries.map(formatSeriesName))
  const timelineProcesses = [
    ...statusLabels,
    ...[...visibleLabels].filter((label) => !statusLabels.has(label)).sort(),
  ].map((label) => ({
    label,
    identity: processIdentities.get(label) ?? label,
  }))
  const timelineData = useStatusTimeline(
    metrics,
    statusSeries,
    timelineProcesses,
  )

  const cpuTotalRaw = sumLastValues(cpuSeries)
  const memoryTotalRaw = sumLastValues(memorySeries)
  const statusCounts = countByStatus(statusSeries)
  const cpuShares = cpuUsageShares(
    cpuTotalRaw,
    hostCpuPercent,
    hostCpuCores,
  )
  const memoryShares = memoryUsageShares(
    memoryTotalRaw,
    hostMemoryUsedBytes,
    hostMemoryTotalBytes,
  )
  const cpuUsageStatus = resolveUsageStatus(
    hostCpuMetricsStatus,
    metrics.status.pm2_cpu,
    cpuShares,
  )
  const memoryUsageStatus = resolveUsageStatus(
    hostMemoryMetricsStatus,
    metrics.status.pm2_memory,
    memoryShares,
  )
  const cpuUsageError =
    metricError(metrics.errors, 'pm2_cpu') ??
    metricError(metrics.errors, 'host_cpu_usage_percent') ??
    metricError(metrics.errors, 'host_cpu_cores') ??
    (showMissingHostErrors && (hostCpuMissing || hostCpuCoresMissing)
      ? missingHostMetricsError('CPU')
      : null)
  const memoryUsageError =
    metricError(metrics.errors, 'pm2_memory') ??
    metricError(metrics.errors, 'host_memory_usage_percent') ??
    metricError(metrics.errors, 'host_memory_total_bytes') ??
    (showMissingHostErrors && (hostMemoryMissing || hostMemoryTotalMissing)
      ? missingHostMetricsError('memory')
      : null)
  const retryUsage = () => {
    void metrics.refresh()
    availability.refresh()
  }

  const metricConnectionError =
    Object.values(metrics.errors).find(
      (error) => error?.code === 'PROMETHEUS_UNREACHABLE',
    ) ?? null
  const allMetricsUnreachable = PROCESS_METRICS.every(
    (metric) =>
      metrics.status[metric] === 'error' &&
      metrics.errors[metric]?.code === 'PROMETHEUS_UNREACHABLE',
  )
  const connectionError =
    allMetricsUnreachable && metricConnectionError
      ? toPrometheusApiError(metricConnectionError)
      : null
  const showNoSeriesBanner =
    connectionError === null && availability.status === 'empty'

  const metricsLoading = metrics.isRefreshing && visibleProcessCount === 0
  // The page loader only covers the very first load. Once the page has loaded
  // it stays mounted, so an auto refresh is reported by the charts themselves.
  const isPageLoaded = metrics.hasLoaded
  const showInitialLoader =
    !isPageLoaded &&
    isMetricsInitialLoad({
      enabled: metricsEnabled,
      status: metrics.status,
      errors: metrics.errors,
      data: metrics.data,
    })

  const cpuServerPending =
    hostCpuCoresStatus === 'loading' || hostCpuCoresStatus === 'idle'
  const cpuServerReady =
    hostCpuCoresStatus === 'success' &&
    cpuCores !== null &&
    cpuCores > 0
  const cpuBasisIsServer = cpuBasis === 'server'
  const cpuCardStatus: LoadStatus = cpuBasisIsServer
    ? cpuServerPending
      ? 'loading'
      : cpuServerReady
        ? metrics.status.pm2_cpu
        : showMissingHostErrors
          ? 'error'
          : metrics.status.pm2_cpu
    : metrics.status.pm2_cpu
  const cpuCardError: ApiError | null =
    cpuBasisIsServer &&
    !cpuServerPending &&
    !cpuServerReady &&
    showMissingHostErrors
      ? {
          code: 'SERVER_CPU_UNAVAILABLE',
          message:
            'Server CPU basis requires the host CPU core count from Prometheus. Update xpm-exporter or switch to PROCESS.',
          status: 0,
        }
      : metricError(metrics.errors, 'pm2_cpu')
  const cpuChartSeries = cpuBasisIsServer
    ? cpuServerReady
      ? toChartSeries(cpuSeries, {
          ...chartStyle(cpuSeries),
          filled: true,
          label: formatSeriesName,
          valueMapper: (value) => normalizeCpu(value, cpuCores),
        })
      : []
    : toChartSeries(cpuSeries, {
        ...chartStyle(cpuSeries),
        filled: true,
        label: formatSeriesName,
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
    hostMemoryTotalStatus === 'loading' || hostMemoryTotalStatus === 'idle'
  const memoryServerReady =
    hostMemoryTotalStatus === 'success' &&
    totalMemoryBytes !== null &&
    totalMemoryBytes > 0
  const memoryBasisIsServer = memoryBasis === 'server'
  const memoryCardStatus: LoadStatus = memoryBasisIsServer
    ? memoryServerPending
      ? 'loading'
      : memoryServerReady
        ? metrics.status.pm2_memory
        : showMissingHostErrors
          ? 'error'
          : metrics.status.pm2_memory
    : metrics.status.pm2_memory
  const memoryCardError: ApiError | null =
    memoryBasisIsServer &&
    !memoryServerPending &&
    !memoryServerReady &&
    showMissingHostErrors
      ? {
          code: 'SERVER_MEMORY_UNAVAILABLE',
          message:
            'Host RAM total is unavailable from Prometheus. Update xpm-exporter or switch to PROCESS.',
          status: 0,
        }
      : metricError(metrics.errors, 'pm2_memory')
  const memoryServerPercent =
    memoryServerReady && memoryTotalRaw !== null
      ? memorySharePercent(memoryTotalRaw, totalMemoryBytes)
      : null
  const memoryChartSeries = memoryBasisIsServer
    ? memoryServerReady
      ? toChartSeries(memorySeries, {
          ...chartStyle(memorySeries),
          filled: true,
          label: formatSeriesName,
          valueMapper: (value) =>
            memorySharePercent(value, totalMemoryBytes) ?? 0,
        })
      : []
    : toChartSeries(memorySeries, {
        ...chartStyle(memorySeries),
        filled: true,
        label: formatSeriesName,
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

  const hostCpuError: ApiError | null =
    metricError(metrics.errors, 'host_cpu_usage_percent') ??
    (showMissingHostErrors && hostCpuMissing
      ? missingHostMetricsError('CPU')
      : null)
  const hostMemoryError: ApiError | null =
    metricError(metrics.errors, 'host_memory_usage_percent') ??
    (showMissingHostErrors && hostMemoryMissing
      ? missingHostMetricsError('memory')
      : null)
  const hostCpuChartSeries = toChartSeries(hostCpuSeries, {
    color: theme.series.cpu,
    filled: true,
    label: () => 'Host total',
  })
  const hostMemoryChartSeries = toChartSeries(hostMemorySeries, {
    color: theme.series.memory,
    filled: true,
    label: () => 'Host total',
  })
  const hostCpuValueFormatter = (value: number | string) =>
    formatPercent(Number(value), 1)
  const hostMemoryValueFormatter = (value: number | string) => {
    const percent = Number(value)
    if (totalMemoryBytes === null) return formatPercent(percent, 1)
    return `${formatPercent(percent, 1)} (${formatBytes(
      (percent / 100) * totalMemoryBytes,
    )})`
  }
  const namespaceItems = useMemo(
    () => [
      { value: 'all', label: 'All namespaces' },
      ...namespaces.map((entry) => ({ value: entry, label: entry })),
    ],
    [namespaces],
  )

  const processesEmptyState =
    serverEntry?.status === 'error' ? (
      serverEntry.requestError ? (
        <ErrorAlert
          error={serverEntry.requestError}
          onRetry={server ? () => void refreshServer(server) : undefined}
          className='mt-4'
        />
      ) : (
        <Empty className='mt-4'>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <ServerOff strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>Processes unavailable</EmptyTitle>
            <EmptyDescription>
              Could not load processes from {serverName}.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )
    ) : (
      <Empty className='mt-4'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <ServerOff strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>No processes</EmptyTitle>
          <EmptyDescription>
            No processes are reporting on {serverName}.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )

  const processesSection = server ? (
    <ProcessesSection
      className='mt-8'
      items={serverProcessItems}
      processesByServer={processesByServer}
      isLoading={overviewStatus === 'loading' || overviewStatus === 'idle'}
      isError={overviewStatus === 'error'}
      empty={processesEmptyState}
      loadingDescription={`Fetching processes from ${serverName}…`}
      gridClassName='xl:grid-cols-3 2xl:grid-cols-4'
    />
  ) : null

  if (!configured) {
    return (
      <div className='min-w-0'>
        {registryError && <ErrorAlert error={registryError} className='mb-3' />}
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
        {processesSection}
      </div>
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
          <LinkButton to='/'>Back to dashboard</LinkButton>
        </EmptyContent>
      </Empty>
    )
  }

  if (showInitialLoader) {
    return (
      <div className='min-w-0'>
        {registryError && <ErrorAlert error={registryError} className='mb-3' />}

        <PageLoader
          className='min-h-[50vh]'
          title='Loading metrics…'
          description={metricsLoadingDescription(serverName)}
        />
        {processesSection}
      </div>
    )
  }

  return (
    <div className='min-w-0'>
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

      {connectionError ? (
        <ErrorAlert
          error={connectionError}
          onRetry={retryUsage}
          className='mt-4'
        />
      ) : (
        <>
          {showNoSeriesBanner && (
            <Alert className='mt-4'>
              <Info strokeWidth={2} />
              <AlertTitle>No samples in Prometheus</AlertTitle>
              <AlertDescription>
                Prometheus has no series for {serverName}. Check that the scrape
                target labels this server as{' '}
                <code className='font-mono'>app=&quot;{serverName}&quot;</code>.
              </AlertDescription>
            </Alert>
          )}

          <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <UsageTrendCard
              title='CPU'
              description='Whole-host usage'
              theme={theme}
              pm2={cpuShares?.pm2 ?? null}
              other={cpuShares?.other ?? null}
              usageStatus={cpuUsageStatus}
              usageError={cpuUsageError}
              trendSeries={hostCpuChartSeries}
              trendStatus={hostCpuStatus}
              trendError={hostCpuError}
              trendValueFormatter={hostCpuValueFormatter}
              trendYAxisFormatter={formatHostPercentAxis}
              trendYAxisMax={HOST_PERCENT_AXIS_MAX}
              timeRange={metrics.range}
              onTimeRangeSelect={selectTimeRange}
              onResetTimeRange={resetTimeRange}
              onRetry={retryUsage}
              className='h-full'
            />
            <UsageTrendCard
              title='Memory'
              description='Whole-host usage'
              theme={theme}
              pm2={memoryShares?.pm2 ?? null}
              other={memoryShares?.other ?? null}
              usageStatus={memoryUsageStatus}
              usageError={memoryUsageError}
              trendSeries={hostMemoryChartSeries}
              trendStatus={hostMemoryStatus}
              trendError={hostMemoryError}
              trendValueFormatter={hostMemoryValueFormatter}
              trendYAxisFormatter={formatHostPercentAxis}
              trendYAxisMax={HOST_PERCENT_AXIS_MAX}
              timeRange={metrics.range}
              onTimeRangeSelect={selectTimeRange}
              onResetTimeRange={resetTimeRange}
              onRetry={retryUsage}
              className='h-full'
              action={
                <span className='text-xs text-muted-foreground'>
                  Host RAM {hostRamLabel}
                </span>
              }
            />
          </div>

          <div className='mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2'>
            <LineChartCard
              title='CPU by process'
              description={cpuDescription}
              series={cpuChartSeries}
              timeRange={metrics.range}
              onTimeRangeSelect={selectTimeRange}
              onResetTimeRange={resetTimeRange}
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

            <LineChartCard
              title='Memory by process'
              description={memoryDescription}
              series={memoryChartSeries}
              timeRange={metrics.range}
              onTimeRangeSelect={selectTimeRange}
              onResetTimeRange={resetTimeRange}
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

            <StatusTimelineCard
              title='Status'
              description={metricDescription(
                metrics.status.pm2_status,
                statusSummary(statusCounts),
              )}
              data={timelineData}
              onTimeRangeSelect={selectTimeRange}
              onResetTimeRange={resetTimeRange}
              theme={theme}
              chartClassName='h-56'
              status={metrics.status.pm2_status}
              error={metricError(metrics.errors, 'pm2_status')}
              onRetry={metrics.refresh}
            />

            <LineChartCard
              title='Uptime'
              description={metricDescription(
                metrics.status.pm2_uptime,
                uptimeSeries.length === 0
                  ? null
                  : processCountLabel(uptimeSeries.length),
              )}
              series={toChartSeries(uptimeSeries, {
                ...chartStyle(uptimeSeries),
                filled: true,
                label: formatSeriesName,
              })}
              timeRange={metrics.range}
              onTimeRangeSelect={selectTimeRange}
              onResetTimeRange={resetTimeRange}
              theme={theme}
              valueFormatter={formatUptimeValue}
              yAxisFormatter={formatUptimeAxis}
              chartClassName='h-56'
              status={metrics.status.pm2_uptime}
              error={metricError(metrics.errors, 'pm2_uptime')}
              onRetry={metrics.refresh}
            />
          </div>
        </>
      )}

      {processesSection}
    </div>
  )
}
