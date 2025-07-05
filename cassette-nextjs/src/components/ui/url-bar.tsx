import * as React from "react"
import { cn } from "@/lib/utils"

export interface UrlBarProps extends React.ComponentProps<"div"> {
  variant?: "dark" | "light"
}

function UrlBar({ className, variant = "dark", ...props }: UrlBarProps) {
  return (
    <div
      className={cn(
        "w-full h-16 sm:h-20 md:h-24 rounded-lg sm:rounded-xl md:rounded-2xl border relative",
        variant === "dark" 
          ? "bg-neutral-800 border-orange-100" 
          : "bg-white border-black",
        // Add retro shadow for light variant
        variant === "light" && "shadow-[2px_2px_0px_0px_#1F2327] sm:shadow-[3px_3px_0px_0px_#1F2327] md:shadow-[4px_4px_0px_0px_#1F2327]",
        className
      )}
      {...props}
    />
  )
}

export { UrlBar }