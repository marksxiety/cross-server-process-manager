import { RefreshCw, TriangleAlert } from 'lucide-react'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { errorCodeLabel } from '@/lib/error-code'
import type { ApiError } from '@/types/api'

type ErrorAlertProps = {
  error: ApiError
  onRetry?: () => void
  className?: string
}

export function ErrorAlert({ error, onRetry, className }: ErrorAlertProps) {
  return (
    <Alert variant='destructive' className={className}>
      <TriangleAlert strokeWidth={2} />
      <AlertTitle>{errorCodeLabel(error.code)}</AlertTitle>
      <AlertDescription>
        <span className='block whitespace-pre-wrap break-words'>
          {error.message}
        </span>
        <span className='mt-0.5 block font-mono text-muted-foreground'>
          {error.code}
          {error.status > 0 ? ` · HTTP ${error.status}` : ''}
        </span>
      </AlertDescription>
      {onRetry && (
        <AlertAction>
          <Button variant='outline' size='sm' onClick={onRetry}>
            <RefreshCw strokeWidth={2} />
            Retry
          </Button>
        </AlertAction>
      )}
    </Alert>
  )
}
