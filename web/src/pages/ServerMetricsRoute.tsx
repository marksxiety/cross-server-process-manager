import { lazy } from 'react'

export const ServerMetricsRoute = lazy(() =>
  import('./ServerMetrics').then((module) => ({
    default: module.ServerMetrics,
  })),
)
