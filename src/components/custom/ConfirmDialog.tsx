import type { ReactNode } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Refresh01Icon } from '@hugeicons/core-free-icons'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  title: string
  description: string
  mediaIcon?: typeof Refresh01Icon
  dialogSize?: 'default' | 'sm'
  actionVariant?: 'default' | 'destructive'
  actionLabel?: string
  triggerClassName?: string
  triggerVariant?: 'default' | 'secondary' | 'outline' | 'destructive'
  onContinue?: () => void
  trigger: ReactNode
}

export function ConfirmDialog({
  title,
  description,
  mediaIcon,
  dialogSize = 'sm',
  actionVariant = 'default',
  actionLabel = 'Continue',
  triggerClassName,
  triggerVariant = 'default',
  onContinue,
  trigger,
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant={triggerVariant} className={cn(triggerClassName)} />}
      >
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent size={dialogSize}>
        <AlertDialogHeader>
          {mediaIcon && (
            <AlertDialogMedia>
              <HugeiconsIcon icon={mediaIcon} strokeWidth={2} />
            </AlertDialogMedia>
          )}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={actionVariant} onClick={onContinue}>
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
