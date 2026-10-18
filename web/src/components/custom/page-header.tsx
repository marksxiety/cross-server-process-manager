import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: string
  children?: ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <>
      <div className='mb-4 min-w-0 sm:mb-6'>
        <h1 className='text-xl font-semibold tracking-tight sm:text-2xl'>{title}</h1>
        {description && (
          <p className='text-sm text-muted-foreground'>{description}</p>
        )}
      </div>

      {children && (
        <div className='mb-2 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4'>
          {children}
        </div>
      )}
    </>
  )
}
