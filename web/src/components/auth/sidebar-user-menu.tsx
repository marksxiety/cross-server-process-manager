import { useState } from 'react'
import { ChevronUp, LogIn, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router'
import { GuestAuthDialog } from '@/components/auth/guest-auth-dialog'
import { UserAvatar } from '@/components/custom/user-avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSidebar } from '@/components/ui/sidebar'
import { Spinner } from '@/components/ui/spinner'
import { isDemoMode } from '@/lib/demo-mode'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

const AVATAR_CLASS =
  'flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground'

export function SidebarUserMenu() {
  const navigate = useNavigate()
  const { state, isMobile } = useSidebar()
  const user = useAuthStore((store) => store.user)
  const status = useAuthStore((store) => store.status)
  const signOut = useAuthStore((store) => store.signOut)
  const clearError = useAuthStore((store) => store.clearError)
  const [isSignInOpen, setIsSignInOpen] = useState(false)
  const [isSignOutOpen, setIsSignOutOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const expanded = isMobile || state === 'expanded'

  if (isDemoMode()) {
    return (
      <Badge
        variant='secondary'
        className='group-data-[collapsible=icon]:hidden'
      >
        Demo
      </Badge>
    )
  }

  const confirmSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      setIsSignOutOpen(false)
      navigate('/login', { replace: true })
    } finally {
      setIsSigningOut(false)
    }
  }

  if (status === 'guest' || !user) {
    return (
      <>
        {expanded ? (
          <button
            type='button'
            className='flex w-full cursor-pointer items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-2 text-left transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring'
            onClick={() => {
              clearError()
              setIsSignInOpen(true)
            }}
          >
            <span className={AVATAR_CLASS}>
              <LogIn className='size-4' strokeWidth={2} />
            </span>
            <span className='text-xs font-medium'>Sign in</span>
          </button>
        ) : (
          <button
            type='button'
            title='Sign in'
            aria-label='Sign in'
            className='mx-auto flex size-8 cursor-pointer items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring'
            onClick={() => {
              clearError()
              setIsSignInOpen(true)
            }}
          >
            <LogIn className='size-4' strokeWidth={2} />
          </button>
        )}
        <GuestAuthDialog open={isSignInOpen} onOpenChange={setIsSignInOpen} />
      </>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type='button'
              aria-label={`Account menu for ${user.name}`}
              className={cn(
                'flex cursor-pointer items-center text-left transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                expanded
                  ? 'w-full gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-2'
                  : 'mx-auto size-8 justify-center rounded-md',
              )}
            />
          }
        >
          <UserAvatar name={user.name} className={AVATAR_CLASS} />
          {expanded && (
            <>
              <span className='grid min-w-0 flex-1 gap-0.5'>
                <span className='flex min-w-0 items-center gap-1.5'>
                  <span className='min-w-0 truncate text-xs font-medium'>
                    {user.name}
                  </span>
                  {user.is_admin && (
                    <Badge
                      variant='outline'
                      className='shrink-0 px-1 py-0 text-[10px] font-normal'
                    >
                      Admin
                    </Badge>
                  )}
                </span>
                <span className='truncate text-[11px] text-muted-foreground'>
                  {user.email}
                </span>
              </span>
              <ChevronUp
                className='size-3.5 shrink-0 text-muted-foreground'
                strokeWidth={2}
              />
            </>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side={expanded ? 'top' : 'right'}
          align={expanded ? 'start' : 'end'}
          sideOffset={8}
          className='w-60'
        >
          {!expanded && (
            <>
              <DropdownMenuGroup>
                <DropdownMenuLabel className='grid grid-cols-3 items-center gap-1'>
                  <span className='col-span-2 min-w-0 truncate text-sm font-medium text-foreground'>
                    {user.name}
                  </span>
                  {user.is_admin && (
                    <Badge
                      variant='outline'
                      className='col-span-1 w-fit justify-self-end font-normal'
                    >
                      Admin
                    </Badge>
                  )}
                  <span className='col-span-3 truncate text-xs font-normal text-muted-foreground'>
                    {user.email}
                  </span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setIsSignOutOpen(true)}>
              <LogOut className='-scale-x-100' strokeWidth={2} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={isSignOutOpen}
        onOpenChange={(open) => {
          if (!open && !isSigningOut) setIsSignOutOpen(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className='text-destructive'>
              <LogOut className='-scale-x-100' strokeWidth={2} />
            </AlertDialogMedia>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of {user.email}? This will end
              every active session for this account on all devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSigningOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant='destructive'
              disabled={isSigningOut}
              onClick={() => void confirmSignOut()}
            >
              {isSigningOut && <Spinner className='size-4' />}
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
