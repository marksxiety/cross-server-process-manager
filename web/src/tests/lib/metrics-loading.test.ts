import { describe, expect, test } from 'vitest'
import {
  isMetricsInitialLoad,
  metricsLoadingDescription,
} from '../../lib/metrics-loading'
import { PROCESS_METRICS } from '../../lib/prometheus'
import type { LoadStatus } from '../../types/dashboard'
import type { MetricsData, ProcessMetricName } from '../../types/prometheus'

function statusMap(status: LoadStatus): Record<ProcessMetricName, LoadStatus> {
  return Object.fromEntries(
    PROCESS_METRICS.map((metric) => [metric, status]),
  ) as Record<ProcessMetricName, LoadStatus>
}

function series(name: string) {
  return {
    metric: { name: 'pm2_cpu', __name__: 'pm2_cpu', app: name },
    values: [],
    points: [],
  }
}

describe('metricsLoadingDescription', () => {
  test('names the subject being fetched', () => {
    expect(metricsLoadingDescription('api-01')).toBe(
      'Fetching metrics for api-01…',
    )
  })

  test('falls back to a generic description for a blank subject', () => {
    expect(metricsLoadingDescription('')).toBe('Fetching metrics…')
    expect(metricsLoadingDescription('   ')).toBe('Fetching metrics…')
  })
})

describe('isMetricsInitialLoad', () => {
  test('is true while the first load is still in flight', () => {
    expect(
      isMetricsInitialLoad({
        enabled: true,
        status: statusMap('loading'),
        errors: {},
        data: {},
      }),
    ).toBe(true)
  })

  test('is false when the scope is not enabled', () => {
    expect(
      isMetricsInitialLoad({
        enabled: false,
        status: statusMap('idle'),
        errors: {},
        data: {},
      }),
    ).toBe(false)
  })

  test('is false once a metric has errored', () => {
    expect(
      isMetricsInitialLoad({
        enabled: true,
        status: statusMap('loading'),
        errors: { pm2_cpu: new Error('unreachable') },
        data: {},
      }),
    ).toBe(false)
  })

  test('is false once every metric has settled', () => {
    expect(
      isMetricsInitialLoad({
        enabled: true,
        status: statusMap('success'),
        errors: {},
        data: {},
      }),
    ).toBe(false)
  })

  test('is false once series have arrived', () => {
    expect(
      isMetricsInitialLoad({
        enabled: true,
        status: statusMap('loading'),
        errors: {},
        data: { pm2_cpu: [series('api-01')] } as MetricsData,
      }),
    ).toBe(false)
  })
})
