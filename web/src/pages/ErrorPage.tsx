import { Link, useRouteError } from 'react-router'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ErrorPage() {
  const error = useRouteError()
  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred.'

  return (
    <div className='flex min-h-dvh flex-col items-center justify-center gap-3 bg-muted/30 p-4 text-center sm:p-6'>
      <TriangleAlert className='size-8 text-destructive' strokeWidth={2} />
      <h1 className='text-base font-semibold sm:text-lg'>Something went wrong</h1>
      <p className='w-full max-w-md break-words text-sm text-muted-foreground'>{message}</p>
      <Button render={<Link to='/' />} variant='outline'>
        Back to dashboard
      </Button>
    </div>
  )
}
