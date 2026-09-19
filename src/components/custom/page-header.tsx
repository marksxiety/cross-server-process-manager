import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: string
  children?: ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <>
      <div className='mb-6'>
        <h1 className='text-2xl font-semibold tracking-tight'>{title}</h1>
        {description && (
          <p className='text-sm text-muted-foreground'>{description}</p>
        )}
      </div>

      {children && (
        <div className='flex items-center justify-between gap-4 border-b pb-4 mb-2 flex-wrap'>
          {children}
        </div>
      )}
    </>
  )
}
