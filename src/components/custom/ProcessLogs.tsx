import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Refresh01Icon } from '@hugeicons/core-free-icons'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fetchProcessLogs } from '@/api/services/process'
import type { ProcessLogs } from '@/types'

const TAIL_OPTIONS = [5, 10, 20, 50, 100, 200, 300]
const DEFAULT_TAIL = 50
const AUTO_REFRESH_INTERVAL_MS = 5000

interface LogsResult {
  key: string
  logs: ProcessLogs
  error: string | null
}

const EMPTY_RESULT: LogsResult = { key: '', logs: {}, error: null }

interface ProcessLogsProps {
  serverUrl: string
  processId: number
}

export function ProcessLogs({ serverUrl, processId }: ProcessLogsProps) {
  const [tail, setTail] = useState(DEFAULT_TAIL)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [result, setResult] = useState<LogsResult>(EMPTY_RESULT)

  const requestKey = `${serverUrl}/${processId}/${tail}`
  const isCurrent = result.key === requestKey
  const logs = isCurrent ? result.logs : {}
  const error = isCurrent ? result.error : null

  useEffect(() => {
    let cancelled = false

    fetchProcessLogs(serverUrl, processId, tail)
      .then((res) => {
        if (cancelled) return
        setResult({
          key: requestKey,
          logs: res.success ? res.info ?? {} : {},
          error: res.success ? null : res.message || 'Failed to fetch logs',
        })
      })
      .catch((err) => {
        if (cancelled) return
        setResult({
          key: requestKey,
          logs: {},
          error: `Failed to fetch logs: ${(err as Error).message}`,
        })
      })

    return () => {
      cancelled = true
    }
  }, [serverUrl, processId, tail, refreshNonce, requestKey])

  useEffect(() => {
    if (!autoRefresh) return
    const intervalId = setInterval(
      () => setRefreshNonce((nonce) => nonce + 1),
      AUTO_REFRESH_INTERVAL_MS,
    )
    return () => clearInterval(intervalId)
  }, [autoRefresh])

  const tailLabel = (value: number) => (value === 5 ? 'Last 5' : String(value))

  return (
    <div className='flex h-full flex-col gap-3 p-4'>
      <div className='flex shrink-0 items-center gap-2'>
        <span className='text-xs text-muted-foreground'>Tail</span>
        <Select value={tail} onValueChange={(value) => setTail(Number(value))}>
          <SelectTrigger size='sm' aria-label='Tail lines'>
            <SelectValue>{(value) => tailLabel(Number(value))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TAIL_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {tailLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className='ml-auto flex items-center gap-2'>
          <label className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            Auto-refresh
            <Switch
              size='sm'
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
          </label>
          <Button
            size='icon'
            variant='outline'
            aria-label='Refresh logs'
            onClick={() => setRefreshNonce((nonce) => nonce + 1)}
          >
            <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
          </Button>
          {!isCurrent && <Spinner />}
        </div>
      </div>

      {error ? (
        <p className='text-xs text-destructive'>{error}</p>
      ) : (
        <div className='flex min-h-0 flex-1 flex-col gap-3'>
          <LogSection title='OUTPUT' lines={logs.out} />
          <LogSection title='ERROR' lines={logs.error} />
        </div>
      )}
    </div>
  )
}

interface LogSectionProps {
  title: string
  lines?: string[]
}

function LogSection({ title, lines }: LogSectionProps) {
  const content = lines?.length ? lines.join('\n') : null
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <span className='mb-1 text-xs font-medium text-muted-foreground'>
        {title}
      </span>
      <ScrollArea className='min-h-0 flex-1 rounded-md border border-border bg-secondary/40 p-2'>
        {content ? (
          <pre className='font-mono text-xs/relaxed wrap-break-word whitespace-pre-wrap'>
            {content}
          </pre>
        ) : (
          <p className='text-xs text-muted-foreground'>No {title} logs.</p>
        )}
      </ScrollArea>
    </div>
  )
}