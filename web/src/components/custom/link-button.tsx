import type { VariantProps } from 'class-variance-authority'
import { Link, type LinkProps } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type LinkButtonProps = LinkProps & VariantProps<typeof buttonVariants>

/**
 * A navigation link styled as a button. Renders a real anchor so screen
 * readers and the browser keep native link semantics.
 */
export function LinkButton({ className, variant, size, ...props }: LinkButtonProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
