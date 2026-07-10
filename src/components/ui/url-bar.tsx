import * as React from "react"
import { cn } from "@/lib/utils"

export interface UrlBarProps extends React.ComponentProps<"div"> {
  variant?: "dark" | "light",
  hasError?: boolean,
  /**
   * While a conversion beam wraps this bar, the brutalist chrome (solid
   * outline + offset shadow) competes with the beam's border light. The
   * beam package's demo cards use a subtle 1px border and soft ambient
   * shadows instead — this swaps to that treatment for the duration.
   */
  beamActive?: boolean
}

function UrlBar({ className, variant = "dark", hasError = false, beamActive = false, ...props }: UrlBarProps) {
  return (
    <div
      className={cn(
        "w-full h-12 sm:h-14 md:h-16 lg:h-20 rounded-lg sm:rounded-xl md:rounded-2xl border relative transition-[border-color,box-shadow] duration-300",
        // bg-field is pure white in light mode and follows the dark card surface in dark mode.
        "bg-field text-card-foreground",
        variant === "dark"
          ? "border-border"
          : "border-foreground",
        // Retro offset shadow (tokens defined in tailwind.config.js)
        variant === "light" && "shadow-flat-2 sm:shadow-flat-3 md:shadow-flat-4",
        // Beam-friendly styling per the border-beam demo: hairline border,
        // soft ambient shadows, so the beam's light reads as THE border.
        beamActive && "border-border/70 shadow-[0_2px_6px_rgba(0,0,0,0.05),0_4px_42px_rgba(0,0,0,0.06)]",
        // Error state
        hasError && "border-destructive shadow-flat-destructive-2 sm:shadow-flat-destructive-3 md:shadow-flat-destructive-4",
        className
      )}
      {...props}
    />
  )
}

export { UrlBar }
