import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

interface PageLoaderProps {
  message?: string
  subtitle?: string
  className?: string
}

function PageLoader({ message, subtitle, className }: PageLoaderProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-background flex flex-col items-center justify-center gap-6",
        className
      )}
    >
      {/* Cassette logo with subtle pulse */}
      <div className="animate-pulse">
        <Image
          src="/images/cassette_logo.png"
          alt="Cassette"
          width={48}
          height={48}
          className="size-12"
          priority
        />
      </div>

      {/* Waveform bars */}
      <div className="flex items-end gap-1 h-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-1 rounded-full bg-primary"
            style={{
              height: "100%",
              animation: "waveform-pulse 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>

      {/* Optional text */}
      {(message || subtitle) && (
        <div className="text-center space-y-1">
          {message && (
            <p className="text-foreground font-atkinson font-medium">
              {message}
            </p>
          )}
          {subtitle && (
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          )}
        </div>
      )}
    </div>
  )
}

export { PageLoader }
