import { LoginForm } from '@/components/auth/login-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type GuestSignInDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GuestSignInDialog({ open, onOpenChange }: GuestSignInDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Sign in to XPM</DialogTitle>
          <DialogDescription>
            Sign in to manage servers, templates, and processes. You can keep
            browsing as a guest.
          </DialogDescription>
        </DialogHeader>

        <LoginForm autoFocus onSuccess={() => onOpenChange(false)} />

        <DialogFooter>
          <DialogClose
            render={<Button variant='outline' className='w-full' />}
          >
            Stay as guest
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
