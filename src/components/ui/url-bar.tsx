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
        variant === "dark"
          ? "bg-muted border-border"
          : "bg-card border-foreground force-light-surface",
        // Add retro shadow for light variant using CSS variable
        variant === "light" && "shadow-[2px_2px_0px_0px_hsl(var(--foreground))] sm:shadow-[3px_3px_0px_0px_hsl(var(--foreground))] md:shadow-[4px_4px_0px_0px_hsl(var(--foreground))]",
        // Add error state
        hasError && "border-destructive shadow-[2px_2px_0px_0px_hsl(var(--destructive))] sm:shadow-[3px_3px_0px_0px_hsl(var(--destructive))] md:shadow-[4px_4px_0px_0px_hsl(var(--destructive))]",
        className
      )}
      {...props}
    />
  )
}

export { UrlBar }