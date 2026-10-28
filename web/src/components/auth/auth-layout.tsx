import type { ReactNode } from 'react'
import xpmIcon from '@/assets/xpm-icon.svg'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ThemeToggle } from '@/components/custom/ThemeToggle'

type AuthLayoutProps = {
  title: string
  description?: string
  children: ReactNode
}

export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className='relative flex min-h-dvh items-center justify-center bg-muted/30 p-4 sm:p-6'>
      <div className='absolute top-4 right-4'>
        <ThemeToggle />
      </div>
      <Card className='w-full max-w-sm'>
        <CardHeader className='flex flex-row items-center gap-3'>
          <img
            src={xpmIcon}
            alt='XPM logo'
            className='size-12 shrink-0 rounded-xl border border-border'
          />
          <div className='min-w-0 space-y-1'>
            <CardTitle className='text-lg font-semibold'>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}
