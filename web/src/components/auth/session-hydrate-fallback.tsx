import { PageLoader } from '@/components/custom/page-loader'

/** Shown by the router while the initial /auth/me check resolves. */
export function SessionHydrateFallback() {
  return (
    <div className='flex min-h-dvh items-center justify-center bg-muted/30 p-4 sm:p-6'>
      <PageLoader title='Loading XPM.' />
    </div>
  )
}
