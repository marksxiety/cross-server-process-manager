import xpmIcon from '@/assets/xpm-icon.svg'

/** Shown by the router while the initial /auth/me check resolves. */
export function SessionHydrateFallback() {
  return (
    <div
      className='xpm-initial-loader'
      role='status'
      aria-label='Loading XPM'
    >
      <div className='icon-wrap'>
        <img src={xpmIcon} className='xpm-icon' alt='' />
      </div>
      <div className='progress-track'>
        <div className='progress-fill' />
      </div>
    </div>
  )
}
