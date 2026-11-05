import { lazy, Suspense, useEffect } from 'react'
import { useParams } from 'react-router'
import { isPrometheusConfigured } from '@/api/services/prometheus.service'
import { PageLoader } from '@/components/custom/page-loader'
import { ServerMetricsHeader } from '@/components/custom/server-metrics-header'
import { useServerMetrics } from '@/hooks/use-server-metrics'
import { useServerSeriesAvailability } from '@/hooks/use-server-series-availability'
import { metricsLoadingDescription } from '@/lib/metrics-loading'
import { normalizeMetricsRefreshMs } from '@/lib/prometheus'
import { useDashboardStore } from '@/stores/dashboard.store'
import { useMetricsStore } from '@/stores/metrics.store'

const LazyServerMetrics = lazy(() =>
  import('./ServerMetrics').then((module) => ({
    default: module.ServerMetrics,
  })),
)

export function ServerMetricsRoute() {
  const { serverName = '' } = useParams<{ serverName: string }>()

  const range = useMetricsStore((state) => state.range)
  const refreshMs = useMetricsStore((state) => state.refreshMs)
  const activeRefreshMs = normalizeMetricsRefreshMs(refreshMs)

  const servers = useDashboardStore((state) => state.servers)
  const load = useDashboardStore((state) => state.load)

  const configured = isPrometheusConfigured()
  const metricsEnabled = configured && serverName !== ''

  const metrics = useServerMetrics({
    serverName,
    range,
    refreshMs: activeRefreshMs,
    enabled: metricsEnabled,
  })

  const availability = useServerSeriesAvailability({
    serverName,
    enabled: metricsEnabled,
    refreshKey: metrics.lastUpdated,
  })

  const refreshMetrics = () => {
    metrics.refresh()
    availability.refresh()
  }

  useEffect(() => {
    void load()
  }, [load])

  const server = servers.find((entry) => entry.server === serverName)

  return (
    <div className='min-w-0'>
      <ServerMetricsHeader
        serverName={serverName}
        host={server?.host ?? null}
        port={server?.port ?? null}
        isRefreshing={
          metrics.isRefreshing || availability.status === 'loading'
        }
        onRefresh={refreshMetrics}
      />

      <Suspense
        fallback={
          <PageLoader
            className='min-h-[50vh]'
            title='Loading metrics…'
            description={metricsLoadingDescription(serverName)}
          />
        }
      >
        <LazyServerMetrics
          serverName={serverName}
          metrics={metrics}
          availability={availability}
        />
      </Suspense>
    </div>
  )
}
