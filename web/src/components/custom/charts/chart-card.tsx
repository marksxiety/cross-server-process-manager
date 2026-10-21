import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { ApiError } from '@/types/api'

export type ChartCardProps = {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  chartClassName?: string
  loading?: boolean
  hasData: boolean
  error?: ApiError | null
  onRetry?: () => void
  emptyLabel?: string
  loadingFallback?: ReactNode
  emptyFallback?: ReactNode
  children: ReactNode
}

function ChartBodyLoading({
  label,
  chartClassName,
}: {
  label: string
  chartClassName?: string
}) {
  return (
    <div
      role='status'
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed text-xs text-muted-foreground',
        chartClassName ?? 'h-48',
      )}
    >
      <Spinner className='size-5' aria-hidden='true' />
      <span>{label}</span>
    </div>
  )
}

function ChartBodyError({
  error,
  onRetry,
  chartClassName,
}: {
  error: ApiError
  onRetry?: () => void
  chartClassName?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 text-center text-xs text-muted-foreground',
        chartClassName ?? 'h-48',
      )}
    >
      <TriangleAlert className='size-4 text-destructive' strokeWidth={2} />
      <p className='line-clamp-2 max-w-full break-words' title={error.message}>
        {error.message}
      </p>
      {onRetry && (
        <Button type='button' variant='outline' size='xs' onClick={onRetry}>
          <RefreshCw strokeWidth={2} />
          Retry
        </Button>
      )}
    </div>
  )
}

export function ChartCard({
  title,
  description,
  action,
  className,
  chartClassName,
  loading = false,
  hasData,
  error,
  onRetry,
  emptyLabel,
  loadingFallback,
  emptyFallback,
  children,
}: ChartCardProps) {
  return (
    <Card size='sm' className={cn(className)}>
      <CardHeader className='pb-1'>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {(action || (hasData && error)) && (
          <CardAction>
            <div className='flex items-center gap-1'>
              {action}
              {hasData && error && (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-xs'
                  className='text-destructive'
                  aria-label={`Retry ${title}`}
                  title={error.message}
                  onClick={onRetry}
                >
                  <TriangleAlert strokeWidth={2} />
                </Button>
              )}
            </div>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {!hasData && loading ? (
          loadingFallback ?? (
            <ChartBodyLoading
              label={`Loading ${title}…`}
              chartClassName={chartClassName}
            />
          )
        ) : !hasData && error ? (
          <ChartBodyError
            error={error}
            onRetry={onRetry}
            chartClassName={chartClassName}
          />
        ) : !hasData ? (
          emptyFallback ?? (
            <div
              className={cn(
                'flex items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground',
                chartClassName ?? 'h-48',
              )}
            >
              {emptyLabel ?? 'No data in this range.'}
            </div>
          )
        ) : (
          <Suspense
            fallback={
              loadingFallback ?? (
                <ChartBodyLoading
                  label='Loading chart…'
                  chartClassName={chartClassName}
                />
              )
            }
          >
            {children}
          </Suspense>
        )}
      </CardContent>
    </Card>
  )
}
