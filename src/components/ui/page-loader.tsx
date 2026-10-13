import * as React from "react"
import Image from "next/image"

import { TextLoader } from "@/components/ui/text-loader"
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
        "min-h-svh bg-background flex flex-col items-center justify-center gap-6",
        className
      )}
    >
      <Image
        src="/images/cassette_logo.svg"
        alt="Cassette"
        width={48}
        height={48}
        className="size-12"
        priority
      />

      <div className="text-center space-y-1">
        <TextLoader text={message} className="text-foreground font-atkinson font-medium" />
        {subtitle && (
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

export { PageLoader }
