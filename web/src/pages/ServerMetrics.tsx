import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Activity, Search, ServerOff } from 'lucide-react'
import { isPrometheusConfigured } from '@/api/services/prometheus.service'
import {
  LineChartCard,
  StatusTimelineCard,
  UsageDonutCard,
} from '@/components/custom/charts'
import { ErrorAlert } from '@/components/custom/error-alert'
import { MetricBasisSwitch } from '@/components/custom/metric-basis-switch'
import { PageLoader } from '@/components/custom/page-loader'
import { ProcessesSection } from '@/components/custom/processes-section'
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
import { useMetricChartSeries } from '@/hooks/use-metric-chart-series'
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
  formatSeriesLabel,
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

export type ServerMetricsProps = {
  serverName: string
  metrics: MetricsRangeResult
}

export function ServerMetrics({ serverName, metrics }: ServerMetricsProps) {
  const cpuBasis = useMetricsStore((state) => state.cpuBasis)
  const setCpuBasis = useMetricsStore((state) => state.setCpuBasis)
  const memoryBasis = useMetricsStore((state) => state.memoryBasis)
  const setMemoryBasis = useMetricsStore((state) => state.setMemoryBasis)
  const theme = useChartTheme()
  const toChartSeries = useMetricChartSeries(metrics)
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
  const cpuCores = serverEntry?.overview?.cpu.cores ?? null
  const totalMemoryBytes = serverEntry?.overview?.memory.totalBytes ?? null
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

  const processIdentities = new Map<string, string>()
  for (const seriesList of Object.values(metrics.data)) {
    for (const series of filterSeries(seriesList ?? [], {
      namespace: activeNamespace === 'all' ? undefined : activeNamespace,
      query,
    })) {
      const label = formatSeriesLabel(series)
      if (!processIdentities.has(label)) {
        processIdentities.set(label, seriesIdentity(series.metric))
      }
    }
  }

  const styleMap = useMemo(
    () => buildProcessStyleMap(Object.values(metrics.data), theme.palette),
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
    for (const series of seriesList) visibleLabels.add(formatSeriesLabel(series))
  }
  const visibleProcessCount = visibleLabels.size

  const statusLabels = new Set(statusSeries.map(formatSeriesLabel))
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
  // The donuts need both the Prometheus metric and the agent overview, so a
  // failure in either one is reported on the card.
  const overviewError = serverEntry?.requestError ?? null
  const cpuUsageError =
    metricError(metrics.errors, 'pm2_cpu') ?? overviewError
  const memoryUsageError =
    metricError(metrics.errors, 'pm2_memory') ?? overviewError
  const retryUsage = () => {
    void metrics.refresh()
    if (server) void refreshServer(server)
  }

  const metricsLoading = metrics.isRefreshing && visibleProcessCount === 0
  const hasError = Object.keys(metrics.errors).length > 0
  const allSettled = PROCESS_METRICS.every(
    (metric) =>
      metrics.status[metric] === 'success' || metrics.status[metric] === 'error',
  )
  const showEmptyState =
    allSettled && visibleProcessCount === 0 && !hasError
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
      ? toChartSeries(cpuSeries, {
          ...chartStyle(cpuSeries),
          filled: true,
          label: formatSeriesLabel,
          valueMapper: (value) => normalizeCpu(value, cpuCores),
        })
      : []
    : toChartSeries(cpuSeries, {
        ...chartStyle(cpuSeries),
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
      ? toChartSeries(memorySeries, {
          ...chartStyle(memorySeries),
          filled: true,
          label: formatSeriesLabel,
          valueMapper: (value) =>
            memorySharePercent(value, totalMemoryBytes) ?? 0,
        })
      : []
    : toChartSeries(memorySeries, {
        ...chartStyle(memorySeries),
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
          <Button render={<Link to='/' />}>Back to dashboard</Button>
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
        <>
          <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <UsageDonutCard
              title='CPU'
              theme={theme}
              pm2={cpuShares?.pm2 ?? null}
              other={cpuShares?.other ?? null}
              status={cpuUsageStatus}
              error={cpuUsageError}
              onRetry={retryUsage}
              className='h-full'
            />
            <UsageDonutCard
              title='Memory'
              theme={theme}
              pm2={memoryShares?.pm2 ?? null}
              other={memoryShares?.other ?? null}
              status={memoryUsageStatus}
              error={memoryUsageError}
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

            <LineChartCard
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

            <StatusTimelineCard
              title='Status'
              description={metricDescription(
                metrics.status.pm2_status,
                statusSummary(statusCounts),
              )}
              data={timelineData}
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
        </>
      )}

      {processesSection}
    </div>
  )
}
