import type { ReactNode } from 'react'
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
        <CardHeader>
          <CardTitle className='text-lg font-semibold'>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}
