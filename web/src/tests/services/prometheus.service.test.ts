import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  isPrometheusConfigured,
  queryRange,
} from '../../api/services/prometheus.service'
import type { ResolvedMetricsRange } from '../../types/prometheus'

const RANGE: ResolvedMetricsRange = {
  start: 1_700_000_000_000,
  end: 1_700_003_600_000,
  step: 15,
}

const PROCESS_SCOPE = {
  kind: 'process' as const,
  name: 'xpm-server',
  namespace: 'XPM',
  server: 'MYPC',
}

const SERVER_SCOPE = {
  kind: 'server' as const,
  server: 'MYPC',
}

function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init?: RequestInit }[] = []
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    return handler(url, init)
  })
  return calls
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('isPrometheusConfigured', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('uses the configured URL', () => {
    vi.stubEnv('VITE_PROMETHEUS_URL', 'http://prom.test')
    expect(isPrometheusConfigured()).toBe(true)
  })

  test('is false when the URL is empty', () => {
    vi.stubEnv('VITE_PROMETHEUS_URL', '')
    expect(isPrometheusConfigured()).toBe(false)
  })
})

describe('queryRange', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_PROMETHEUS_URL', 'http://prom.test/')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  test('builds the query_range request and parses the matrix', async () => {
    const calls = stubFetch(() =>
      jsonResponse({
        status: 'success',
        data: {
          resultType: 'matrix',
          result: [
            {
              metric: { __name__: 'pm2_cpu', name: 'xpm-server' },
              values: [[1_700_000_000, '1.5']],
            },
          ],
        },
      }),
    )

    const series = await queryRange('pm2_cpu', PROCESS_SCOPE, RANGE)

    expect(series).toEqual([
      {
        metric: { __name__: 'pm2_cpu', name: 'xpm-server' },
        points: [{ timestamp: 1_700_000_000_000, value: 1.5 }],
      },
    ])

    expect(calls).toHaveLength(1)
    const url = new URL(calls[0]!.url)
    expect(url.origin).toBe('http://prom.test')
    expect(url.pathname).toBe('/api/v1/query_range')
    expect(url.searchParams.get('query')).toBe(
      'pm2_cpu{name="xpm-server",namespace="XPM",app="MYPC"}',
    )
    expect(url.searchParams.get('start')).toBe('1700000000')
    expect(url.searchParams.get('end')).toBe('1700003600')
    expect(url.searchParams.get('step')).toBe('15')
  })

  test('builds a server-scoped selector without name', async () => {
    const calls = stubFetch(() =>
      jsonResponse({
        status: 'success',
        data: { resultType: 'matrix', result: [] },
      }),
    )

    await queryRange('pm2_cpu', SERVER_SCOPE, RANGE)

    const url = new URL(calls[0]!.url)
    expect(url.searchParams.get('query')).toBe('pm2_cpu{app="MYPC"}')
  })

  test('throws a typed error for an error envelope', async () => {
    stubFetch(() =>
      jsonResponse(
        {
          status: 'error',
          errorType: 'bad_data',
          error: 'invalid query',
        },
        400,
      ),
    )

    await expect(queryRange('pm2_cpu', PROCESS_SCOPE, RANGE)).rejects.toMatchObject({
      code: 'PROMETHEUS_QUERY_ERROR',
      status: 400,
      message: 'bad_data: invalid query',
    })
  })

  test('rejects an unexpected result type', async () => {
    stubFetch(() =>
      jsonResponse({
        status: 'success',
        data: { resultType: 'vector', result: [] },
      }),
    )

    await expect(queryRange('pm2_cpu', PROCESS_SCOPE, RANGE)).rejects.toMatchObject({
      code: 'PROMETHEUS_INVALID_RESPONSE',
    })
  })

  test('maps network failures to PROMETHEUS_UNREACHABLE', async () => {
    stubFetch(() => {
      throw new Error('fetch failed')
    })

    await expect(queryRange('pm2_cpu', PROCESS_SCOPE, RANGE)).rejects.toMatchObject({
      code: 'PROMETHEUS_UNREACHABLE',
      status: 0,
    })
  })

  test('rejects when the URL is not configured', async () => {
    vi.stubEnv('VITE_PROMETHEUS_URL', '')

    await expect(queryRange('pm2_cpu', PROCESS_SCOPE, RANGE)).rejects.toMatchObject({
      code: 'PROMETHEUS_NOT_CONFIGURED',
    })
  })
})
