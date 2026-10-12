import { afterEach, describe, expect, test, vi } from 'vitest'
import { isAgentStatusResponse, probeAgent } from '../../api/services/agent.service'
import type { ApiResponse } from '../../types/api'

const TARGET = { protocol: 'http' as const, host: '192.168.1.10', port: 4000 }

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

const banner = (info: unknown, status = 200, success = true): ApiResponse<unknown> => ({
  success,
  message: 'XPM agent is running',
  info,
  status,
})

describe('isAgentStatusResponse', () => {
  test('accepts the agent liveness banner', () => {
    expect(isAgentStatusResponse(banner({ pid: 34872 }))).toBe(true)
  })

  test('rejects a non-200 status even with an agent-shaped body', () => {
    expect(isAgentStatusResponse(banner({ pid: 34872 }, 503))).toBe(false)
  })

  test('rejects a failed envelope', () => {
    expect(isAgentStatusResponse({ ...banner({ pid: 34872 }), success: false })).toBe(false)
  })

  test('rejects a 200 without a numeric pid', () => {
    expect(isAgentStatusResponse(banner({ pid: '34872' }))).toBe(false)
    expect(isAgentStatusResponse(banner(null))).toBe(false)
    expect(isAgentStatusResponse(banner({}))).toBe(false)
  })
})

describe('probeAgent', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('accepts the agent liveness banner', async () => {
    stubFetch(() => jsonResponse({ success: true, message: 'XPM agent is running', info: { pid: 34872 } }))

    const result = await probeAgent(TARGET)

    expect(result.success).toBe(true)
    expect(result.status).toBe(200)
    expect(result.info).toEqual({ pid: 34872 })
  })

  test('hits the public root route with an abort signal', async () => {
    const calls = stubFetch(() =>
      jsonResponse({ success: true, message: 'XPM agent is running', info: { pid: 34872 } }),
    )

    await probeAgent(TARGET)

    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe('http://192.168.1.10:4000/')
    expect(calls[0]?.init?.signal).toBeInstanceOf(AbortSignal)
  })

  test('rejects a 200 from a non-agent service', async () => {
    stubFetch(() => jsonResponse({ success: true, message: 'hello', info: { version: 1 } }))

    const result = await probeAgent(TARGET)

    expect(result.success).toBe(false)
    expect(result.info).toBeNull()
    expect(result.message).toContain('No XPM agent responded at 192.168.1.10:4000')
  })

  test('rejects a non-200 response', async () => {
    stubFetch(() => jsonResponse({ success: false, message: 'boom', info: null }, 503))

    const result = await probeAgent(TARGET)

    expect(result.success).toBe(false)
    expect(result.status).toBe(503)
    expect(result.message).toContain('No XPM agent responded at 192.168.1.10:4000')
  })

  test('maps a network failure to an unreachable envelope', async () => {
    stubFetch(() => {
      throw new Error('fetch failed')
    })

    const result = await probeAgent(TARGET)

    expect(result).toEqual({
      success: false,
      message: expect.stringContaining('No XPM agent responded at 192.168.1.10:4000'),
      info: null,
      status: 0,
    })
  })

  test('aborts a hung probe after the timeout', async () => {
    stubFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('The operation timed out.', 'TimeoutError')),
          )
        }),
    )

    const result = await probeAgent(TARGET, 10)

    expect(result.success).toBe(false)
    expect(result.status).toBe(0)
    expect(result.message).toContain('No XPM agent responded at 192.168.1.10:4000')
  })
})
