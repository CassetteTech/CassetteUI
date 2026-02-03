import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const spinnerVariants = cva("animate-spin", {
  variants: {
    size: {
      xs: "size-3",   // 12px
      sm: "size-4",   // 16px
      md: "size-6",   // 24px
      lg: "size-8",   // 32px
      xl: "size-12",  // 48px
    },
    variant: {
      default: "text-current",
      primary: "text-primary",
      muted: "text-muted-foreground",
      white: "text-white",
    },
  },
  defaultVariants: {
    size: "md",
    variant: "default",
  },
})

function Spinner({
  className,
  size,
  variant,
  ...props
}: React.SVGProps<SVGSVGElement> & VariantProps<typeof spinnerVariants>) {
  const id = React.useId()
  const gradientId = `spinner-gradient-${id}`

  return (
    <svg
      className={cn(spinnerVariants({ size, variant, className }))}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="status"
      aria-label="Loading"
      {...props}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
      </defs>
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="45 15"
      />
    </svg>
  )
}

export { Spinner, spinnerVariants }
