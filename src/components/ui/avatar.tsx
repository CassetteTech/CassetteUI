"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  const rawSrc = typeof props.src === "string" ? props.src : undefined
  const [resolvedSrc, setResolvedSrc] = React.useState(rawSrc)
  const [repairAttempted, setRepairAttempted] = React.useState(false)
  const objectUrlRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setResolvedSrc(rawSrc)
    setRepairAttempted(false)
  }, [rawSrc])

  React.useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  const tryRepairCorruptedPng = React.useCallback(async () => {
    if (!rawSrc || repairAttempted || !/^https?:\/\//i.test(rawSrc)) return
    setRepairAttempted(true)

    try {
      const response = await fetch(rawSrc, { cache: "no-store" })
      if (!response.ok) return

      const bytes = new Uint8Array(await response.arrayBuffer())
      const hasCorruptPrefix =
        bytes.length > 8 &&
        bytes[0] === 0xef &&
        bytes[1] === 0xbf &&
        bytes[2] === 0xbd &&
        bytes[3] === 0x50 &&
        bytes[4] === 0x4e &&
        bytes[5] === 0x47

      if (!hasCorruptPrefix) return

      const repaired = new Uint8Array(bytes.length - 2)
      repaired[0] = 0x89
      repaired.set(bytes.subarray(3), 1)

      const blobUrl = URL.createObjectURL(new Blob([repaired], { type: "image/png" }))
      objectUrlRef.current = blobUrl
      setResolvedSrc(blobUrl)
    } catch {
      // Keep default fallback if repair fails.
    }
  }, [rawSrc, repairAttempted])

  const handleError: NonNullable<React.ComponentProps<typeof AvatarPrimitive.Image>["onError"]> = (event) => {
    if (props.onError) {
      props.onError(event)
    }
    void tryRepairCorruptedPng()
  }

  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
      src={resolvedSrc}
      onError={handleError}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
