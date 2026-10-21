import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

export type PageLoaderProps = {
  title: string
  description?: string
  className?: string
}

export function PageLoader({
  title,
  description,
  className,
}: PageLoaderProps) {
  return (
    <div
      role='status'
      aria-live='polite'
      className={cn(
        'flex min-h-[60vh] w-full items-center justify-center',
        className,
      )}
    >
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant='icon' className='size-14 rounded-full'>
            <Spinner className='size-7' aria-hidden='true' />
          </EmptyMedia>
          <EmptyTitle className='text-base'>{title}</EmptyTitle>
          {description && <EmptyDescription>{description}</EmptyDescription>}
        </EmptyHeader>
      </Empty>
    </div>
  )
}
