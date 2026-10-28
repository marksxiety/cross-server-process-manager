import { cn } from '@/lib/utils'

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  )
}

export function UserAvatar({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  return (
    <div
      aria-hidden='true'
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground',
        className,
      )}
    >
      {initials(name)}
    </div>
  )
}
