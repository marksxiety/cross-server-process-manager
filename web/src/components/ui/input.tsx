import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

const inputSizeClasses = {
  default: "h-10 rounded-md px-3 py-2 text-base lg:h-7 lg:px-2 lg:py-0.5 lg:text-xs/relaxed",
  xs: "h-10 rounded-sm px-2 py-0 text-base lg:h-6 lg:text-xs/relaxed",
} as const

type InputProps = Omit<React.ComponentProps<"input">, "size"> & {
  size?: keyof typeof inputSizeClasses
}

function Input({ className, type, size = "default", ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(
        "w-full min-w-0 border border-input bg-input/20 transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm/relaxed file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 lg:file:h-6 lg:file:text-xs/relaxed",
        inputSizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

export { Input }
