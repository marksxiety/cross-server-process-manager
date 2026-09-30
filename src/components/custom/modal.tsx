import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: ReactNode
  description?: ReactNode
  footer?: ReactNode
  className?: string
  footerClassName?: string
  showCloseButton?: boolean
  children: ReactNode
}

/**
 * Generic dialog shell: renders the Dialog and its content wrapper, leaving the
 * body (and optionally title/description/footer) to the caller.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  footer,
  className,
  footerClassName,
  showCloseButton = true,
  children,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className} showCloseButton={showCloseButton}>
        {(title != null || description != null) && (
          <DialogHeader className='pr-6'>
            {title != null && <DialogTitle>{title}</DialogTitle>}
            {description != null && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children}
        {footer != null && <DialogFooter className={footerClassName}>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
