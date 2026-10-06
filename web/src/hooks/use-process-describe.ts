import { useCallback, useEffect, useState } from 'react'
import { processService } from '@/api/services/process.service'
import { toApiError, toUnreachableError } from '@/lib/error-code'
import type { ApiError } from '@/types/api'
import type { LoadStatus } from '@/types/dashboard'
import type { ProcessDescribe } from '@/types/process'
import type { RegisteredServer } from '@/types/server'

interface DescribeResult {
  key: string
  attempt: number
  status: Exclude<LoadStatus, 'idle' | 'loading'>
  data: ProcessDescribe | null
  requestError: ApiError | null
}

export function useProcessDescribe(
  server: RegisteredServer | null,
  pmId: number | null,
) {
  const key =
    server && pmId !== null
      ? `${server.protocol}://${server.host}:${server.port}/${pmId}`
      : null

  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<DescribeResult | null>(null)

  useEffect(() => {
    if (key === null || server === null || pmId === null) return

    let cancelled = false

    void (async () => {
      try {
        const response = await processService(server).describe(pmId)
        if (cancelled) return

        if (!response.success || !response.info) {
          setResult({
            key,
            attempt,
            status: 'error',
            data: null,
            requestError: toApiError(response),
          })
          return
        }

        setResult({
          key,
          attempt,
          status: 'success',
          data: response.info,
          requestError: null,
        })
      } catch (cause) {
        if (cancelled) return
        setResult({
          key,
          attempt,
          status: 'error',
          data: null,
          requestError: toUnreachableError(cause),
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [key, server, pmId, attempt])

  const retry = useCallback(() => {
    setAttempt((value) => value + 1)
  }, [])

  const isCurrent =
    result !== null && result.key === key && result.attempt === attempt
  const status: LoadStatus =
    key === null ? 'idle' : isCurrent ? result.status : 'loading'

  return {
    status,
    isDescribing: status === 'loading',
    data: isCurrent ? result.data : null,
    requestError: isCurrent ? result.requestError : null,
    retry,
  } satisfies {
    status: LoadStatus
    isDescribing: boolean
    data: ProcessDescribe | null
    requestError: ApiError | null
    retry: () => void
  }
}
