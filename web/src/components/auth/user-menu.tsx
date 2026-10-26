import { ChevronDown, LogIn, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { isDemoMode } from '@/lib/demo-mode'
import { useAuthStore } from '@/stores/auth.store'

export function UserMenu() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const status = useAuthStore((state) => state.status)
  const logout = useAuthStore((state) => state.logout)

  if (isDemoMode()) {
    return (
      <Badge variant='secondary' className='font-normal'>
        Demo
      </Badge>
    )
  }

  const goToLogin = () => {
    logout()
    navigate('/login', { replace: true })
  }

  if (status === 'guest' || !user) {
    return (
      <Button variant='outline' size='sm' onClick={goToLogin}>
        <LogIn strokeWidth={2} />
        Sign in
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='ghost'
            size='sm'
            className='gap-2'
            aria-label={`Account menu for ${user.name}`}
          />
        }
      >
        <span className='max-w-40 truncate text-sm font-medium'>{user.name}</span>
        <ChevronDown strokeWidth={2} className='size-3.5 text-muted-foreground' />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56'>
        <DropdownMenuLabel className='flex flex-col gap-1'>
          <span className='truncate text-sm font-medium text-foreground'>{user.name}</span>
          <span className='truncate text-xs font-normal text-muted-foreground'>
            {user.email}
          </span>
          <Badge variant='outline' className='mt-1 w-fit font-normal capitalize'>
            {user.role}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={goToLogin}>
          <LogOut strokeWidth={2} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
