import { useCallback, useEffect, useMemo, useState } from 'react'
import { History, RefreshCw, Search, X } from 'lucide-react'
import { adminService } from '@/api/services/admin.service'
import { AuditTable } from '@/components/custom/audit-table'
import { ErrorAlert } from '@/components/custom/error-alert'
import { PageHeader } from '@/components/custom/page-header'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { filterAuditEntries } from '@/lib/audit-format'
import { isDemoMode } from '@/lib/demo-mode'
import { toApiError } from '@/lib/error-code'
import type { ApiError } from '@/types/api'
import type { AuditEntry } from '@/types/audit'

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(!isDemoMode())
  const [requestError, setRequestError] = useState<ApiError | null>(null)

  const fetchEntries = useCallback(async () => {
    const result = await adminService().audit()
    setIsLoading(false)

    if (!result.success) {
      setRequestError(toApiError(result))
      return
    }

    setRequestError(null)
    setEntries(Array.isArray(result.info) ? result.info : [])
  }, [])

  const refresh = useCallback(async () => {
    if (isDemoMode()) return
    setIsLoading(true)
    setRequestError(null)
    await fetchEntries()
  }, [fetchEntries])

  useEffect(() => {
    if (isDemoMode()) return

    let cancelled = false
    void (async () => {
      const result = await adminService().audit()
      if (cancelled) return

      setIsLoading(false)
      if (!result.success) {
        setRequestError(toApiError(result))
        return
      }

      setRequestError(null)
      setEntries(Array.isArray(result.info) ? result.info : [])
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredEntries = useMemo(
    () => filterAuditEntries(entries, query),
    [entries, query],
  )

  return (
    <div className='min-w-0'>
      <PageHeader
        title='Audit log'
        description='Who performed an action, and when.'
      >
        <div className='relative w-full sm:max-w-56'>
          <Search
            aria-hidden='true'
            className='pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground'
            strokeWidth={2}
          />
          <Input
            size='xs'
            className='pl-7'
            value={query}
            placeholder='Search any column…'
            aria-label='Search audit log'
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setQuery('')
            }}
          />
          {query !== '' && (
            <button
              type='button'
              aria-label='Clear search'
              title='Clear search'
              className='absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground'
              onClick={() => setQuery('')}
            >
              <X className='size-3.5' strokeWidth={2} />
            </button>
          )}
        </div>

        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => void refresh()}
        >
          <RefreshCw
            strokeWidth={2}
            className={isLoading ? 'animate-spin' : undefined}
          />
          Refresh
        </Button>
      </PageHeader>

      {requestError && (
        <ErrorAlert
          error={requestError}
          className='my-6'
          onRetry={() => void refresh()}
        />
      )}

      {!requestError && isLoading && entries.length === 0 && (
        <AuditTable entries={[]} loading />
      )}

      {!isLoading && !requestError && entries.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <History strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>No audit events</EmptyTitle>
            <EmptyDescription>
              Actions performed in this environment will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {entries.length > 0 && (
        <>
          <p className='mb-3 text-xs text-muted-foreground'>
            Showing {filteredEntries.length} of {entries.length}
          </p>

          {filteredEntries.length > 0 ? (
            <AuditTable entries={filteredEntries} />
          ) : (
            <p className='py-6 text-sm text-muted-foreground'>
              No matching events.
            </p>
          )}
        </>
      )}
    </div>
  )
}
