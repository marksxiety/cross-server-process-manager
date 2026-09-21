import { useEffect, useState } from 'react'
import { processService } from '@/api/services/process.service'
import type { LoadStatus } from '@/types/dashboard'
import type { ProcessDescribe } from '@/types/process'
import type { RegisteredServer } from '@/types/server'

interface DescribeResult {
  key: string
  status: Exclude<LoadStatus, 'idle' | 'loading'>
  data: ProcessDescribe | null
  error: string | null
}

export function useProcessDescribe(
  server: RegisteredServer | null,
  pmId: number | null,
) {
  const key =
    server && pmId !== null
      ? `${server.protocol}://${server.host}:${server.port}/${pmId}`
      : null

  const [result, setResult] = useState<DescribeResult | null>(null)

  useEffect(() => {
    if (key === null || !server || pmId === null) return

    let cancelled = false

    void (async () => {
      try {
        const response = await processService(server).describe(pmId)
        if (cancelled) return

        if (!response.success || !response.info) {
          setResult({
            key,
            status: 'error',
            data: null,
            error: response.message,
          })
          return
        }

        setResult({ key, status: 'success', data: response.info, error: null })
      } catch (cause) {
        if (cancelled) return
        setResult({
          key,
          status: 'error',
          data: null,
          error: (cause as Error).message,
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [key, server, pmId])

  const isCurrent = result !== null && result.key === key

  return {
    status: key === null ? 'idle' : isCurrent ? result.status : 'loading',
    data: isCurrent ? result.data : null,
    error: isCurrent ? result.error : null,
  } satisfies { status: LoadStatus; data: ProcessDescribe | null; error: string | null }
}
