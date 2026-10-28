import { Link } from 'react-router'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'

export function Forbidden() {
  return (
    <AuthLayout
      title='403'
      description="You don't have access to this page"
    >
      <Button className='w-full' render={<Link to='/' />}>
        Back to dashboard
      </Button>
    </AuthLayout>
  )
}
