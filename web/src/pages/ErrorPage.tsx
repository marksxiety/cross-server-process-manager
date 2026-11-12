import { isRouteErrorResponse, useRouteError } from 'react-router'
import { TriangleAlert } from 'lucide-react'
import { LinkButton } from '@/components/custom/link-button'

export function ErrorPage() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className='flex min-h-dvh flex-col items-center justify-center gap-3 bg-muted/30 p-4 text-center sm:p-6'>
        <TriangleAlert className='size-8 text-destructive' strokeWidth={2} />
        <h1 className='text-base font-semibold sm:text-lg'>Page not found</h1>
        <p className='w-full max-w-md break-words text-sm text-muted-foreground'>
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <LinkButton to='/' variant='outline'>
          Back to dashboard
        </LinkButton>
      </div>
    )
  }

  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred.'

  return (
    <div className='flex min-h-dvh flex-col items-center justify-center gap-3 bg-muted/30 p-4 text-center sm:p-6'>
      <TriangleAlert className='size-8 text-destructive' strokeWidth={2} />
      <h1 className='text-base font-semibold sm:text-lg'>Something went wrong</h1>
      <p className='w-full max-w-md break-words text-sm text-muted-foreground'>{message}</p>
      <LinkButton to='/' variant='outline'>
        Back to dashboard
      </LinkButton>
    </div>
  )
}
