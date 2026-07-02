import * as React from "react"
import { cn } from "@/lib/utils"

export interface UrlBarProps extends React.ComponentProps<"div"> {
  variant?: "dark" | "light",
  hasError?: boolean
}

function UrlBar({ className, variant = "dark", hasError = false, ...props }: UrlBarProps) {
  return (
    <div
      className={cn(
        "w-full h-12 sm:h-14 md:h-16 lg:h-20 rounded-lg sm:rounded-xl md:rounded-2xl border relative transition-colors duration-300",
        // bg-field is pure white in light mode and follows the dark card surface in dark mode.
        "bg-field text-card-foreground",
        variant === "dark"
          ? "border-border"
          : "border-foreground",
        // Retro offset shadow (tokens defined in tailwind.config.js)
        variant === "light" && "shadow-flat-2 sm:shadow-flat-3 md:shadow-flat-4",
        // Error state
        hasError && "border-destructive shadow-flat-destructive-2 sm:shadow-flat-destructive-3 md:shadow-flat-destructive-4",
        className
      )}
      {...props}
    />
  )
}

export { UrlBar }
