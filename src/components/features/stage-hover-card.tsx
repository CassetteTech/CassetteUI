"use client"

import { useState } from "react"
import Image from "next/image"
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card"

interface StageHoverCardProps {
  children: React.ReactNode
}

export function StageHoverCard({ children }: StageHoverCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={200} closeDelay={300}>
      <HoverCardTrigger
        asChild
        onPointerDown={(e: React.PointerEvent) => {
          if (e.pointerType === "touch") {
            e.preventDefault()
            setOpen((prev) => !prev)
          }
        }}
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-72">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Image
              src="/images/cassette_logo.png"
              alt="Cassette"
              width={24}
              height={24}
              className="shrink-0"
            />
            <p className="text-sm font-semibold">Welcome to the Cassette Alpha!</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Cassette is in its earliest stage. Here&apos;s what to expect:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
            <li>Features may change or be added frequently</li>
            <li>You might encounter bugs. We&apos;d love to hear about them</li>
            <li>Your feedback directly shapes the product</li>
            <li>Core experience: share music &amp; build your music profile</li>
          </ul>
          <p className="text-xs italic text-muted-foreground pt-1">
            Thanks for being an early supporter!
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
