import * as React from "react"
import { cn } from "@/lib/utils"

function AuthInput({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        "border-gray-400 bg-white dark:border-gray-600 dark:bg-gray-900",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-600 focus-visible:border-gray-600",
        "dark:focus-visible:ring-gray-400 dark:focus-visible:border-gray-400",
        className
      )}
      {...props}
    />
  )
}

export { AuthInput }