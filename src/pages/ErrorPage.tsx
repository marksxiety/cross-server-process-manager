import { Link, useRouteError } from 'react-router'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ErrorPage() {
  const error = useRouteError()
  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred.'

  return (
    <div className='flex h-svh flex-col items-center justify-center gap-3 bg-muted/30 p-6 text-center'>
      <TriangleAlert className='size-8 text-destructive' strokeWidth={2} />
      <h1 className='text-lg font-semibold'>Something went wrong</h1>
      <p className='max-w-md break-words text-sm text-muted-foreground'>{message}</p>
      <Button render={<Link to='/' />} variant='outline'>
        Back to dashboard
      </Button>
    </div>
  )
}
