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
        "w-full h-16 sm:h-20 md:h-24 rounded-lg sm:rounded-xl md:rounded-2xl border relative transition-colors duration-300",
        variant === "dark"
          ? "bg-bgSubtle border-brandCreamD"
          : "bg-white border-brandBlack",
        // Add retro shadow for light variant using CSS variable
        variant === "light" && "shadow-[2px_2px_0px_0px_var(--brand-black)] sm:shadow-[3px_3px_0px_0px_var(--brand-black)] md:shadow-[4px_4px_0px_0px_var(--brand-black)]",
        // Add error state
        hasError && "border-destructive shadow-[2px_2px_0px_0px_hsl(var(--destructive))] sm:shadow-[3px_3px_0px_0px_hsl(var(--destructive))] md:shadow-[4px_4px_0px_0px_hsl(var(--destructive))]",
        className
      )}
      {...props}
    />
  )
}

export { UrlBar }