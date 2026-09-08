import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProcessLogs } from '@/types'

const TAIL_OPTIONS = [5, 10, 20, 50, 100, 200, 300]
const DEFAULT_TAIL = 50

const MOCK_LOG_ENTRIES: ProcessLogs[] = [
  {
    out: [
      '[2026-08-31 09:41:02] [info] Worker 3 started',
      '[2026-08-31 09:41:02] [info] Worker 2 started',
      '[2026-08-31 09:41:02] [info] Worker 1 started',
      '[2026-08-31 09:41:02] [info] HTTP server listening on 0.0.0.0:4000',
      '[2026-08-31 09:41:01] [info] Boot sequence completed',
    ],
    error: [],
  },
  {
    out: [
      '[2026-08-31 09:30:00] [info] Queue drained: 42 items processed',
      '[2026-08-31 09:29:58] [info] Polling for new jobs...',
      '[2026-08-31 09:29:55] [info] Queue drained: 38 items processed',
      '[2026-08-31 09:29:52] [info] Polling for new jobs...',
    ],
    error: [
      '[2026-08-31 09:28:10] [error] Job timeout after 30s: task-9912',
      '[2026-08-31 09:25:44] [error] Retrying failed job: task-9887',
    ],
  },
  {
    out: [
      '[2026-08-31 08:55:00] [info] Cron scheduled run started',
      '[2026-08-31 08:55:00] [info] No pending jobs to execute',
      '[2026-08-31 08:54:59] [info] Cron scheduled run started',
    ],
    error: [
      '[2026-08-31 08:50:00] [fatal] Process exited with code 1',
      '[2026-08-31 08:49:59] [error] Database connection refused',
    ],
  },
  {
    out: [
      '[2026-08-31 08:15:00] [info] Report generated: weekly-summary.pdf',
      '[2026-08-31 08:15:00] [info] Report generated: daily-sales.csv',
      '[2026-08-31 08:14:59] [info] Fetching data sources...',
    ],
    error: [],
  },
]

interface ProcessLogsProps {
  processId: number
}

export function ProcessLogs({ processId }: ProcessLogsProps) {
  const [tail, setTail] = useState(DEFAULT_TAIL)

  const logs = MOCK_LOG_ENTRIES[processId % MOCK_LOG_ENTRIES.length]
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
      </div>

      <div className='flex min-h-0 flex-1 flex-col gap-3'>
        <LogSection title='OUTPUT' lines={logs.out?.slice(0, tail)} />
        <LogSection title='ERROR' lines={logs.error?.slice(0, tail)} />
      </div>
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