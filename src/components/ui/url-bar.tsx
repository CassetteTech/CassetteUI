import * as React from "react"
import { cn } from "@/lib/utils"

export interface UrlBarProps extends React.ComponentProps<"div"> {
  variant?: "dark" | "light",
  hasError?: boolean,
  beamActive?: boolean
}

function UrlBar({ className, variant = "dark", hasError = false, beamActive = false, ...props }: UrlBarProps) {
  return (
    <div
      className={cn(
        "w-full h-12 sm:h-14 md:h-16 lg:h-20 rounded-lg sm:rounded-xl md:rounded-2xl border relative transition-[border-color,box-shadow] duration-300",
        "force-light bg-field text-card-foreground",
        "has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
        variant === "dark"
          ? "border-border"
          : "border-foreground",
        variant === "light" && "shadow-flat-2 sm:shadow-flat-3 md:shadow-flat-4",
        beamActive && "border-border/70 shadow-[0_2px_6px_rgba(0,0,0,0.05),0_4px_42px_rgba(0,0,0,0.06)]",
        hasError && "border-destructive shadow-flat-destructive-2 sm:shadow-flat-destructive-3 md:shadow-flat-destructive-4",
        className
      )}
      {...props}
    />
  )
}

export { UrlBar }
