import { AuthLayout } from '@/components/auth/auth-layout'
import { LinkButton } from '@/components/custom/link-button'

export function Forbidden() {
  return (
    <AuthLayout
      title='403'
      description="You don't have access to this page"
    >
      <LinkButton to='/' className='w-full'>
        Back to dashboard
      </LinkButton>
    </AuthLayout>
  )
}
