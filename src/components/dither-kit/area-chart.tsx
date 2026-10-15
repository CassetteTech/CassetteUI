"use client"

import { Children, isValidElement, type ReactNode, useMemo } from "react"
import { cn } from "@/lib/utils"
import { CartesianCanvas } from "./cartesian-canvas"
import {
  type ChartConfig,
  ChartContext,
  type Margins,
  useChartController,
} from "./chart-context"
import { useChartDimensions } from "./use-chart-dimensions"

// `object` rather than `Record<string, unknown>`: interfaces don't get an
// implicit index signature, so interface-typed rows failed to satisfy the
// generic. Layers read row fields through `field` in scales.ts.
type Row = object

function layerOf(node: ReactNode): "back" | "dom" | "svg" {
  if (!isValidElement(node) || typeof node.type === "string") return "svg"
  return (node.type as { chartLayer?: "back" | "dom" }).chartLayer ?? "svg"
}

export function AreaChart<TData extends Row>({
  data,
  config,
  children,
  yMax,
  margins: marginsProp,
  className,
  animate = true,
}: {
  data: TData[]
  config: ChartConfig
  children: ReactNode
  yMax?: number
  margins?: Partial<Margins>
  className?: string
  animate?: boolean
}) {
  const { ref, size } = useChartDimensions<HTMLDivElement>()
  const { top = 10, right = 12, bottom = 22, left = 36 } = marginsProp ?? {}
  const margins = useMemo(
    () => ({ top, right, bottom, left }),
    [top, right, bottom, left]
  )

  const ctx = useChartController({
    data,
    config,
    yMax,
    dimensions: size,
    margins,
    animate,
  })

  const backChildren: ReactNode[] = []
  const svgChildren: ReactNode[] = []
  const domChildren: ReactNode[] = []
  Children.forEach(children, (child) => {
    const layer = layerOf(child)
    if (layer === "back") backChildren.push(child)
    else if (layer === "dom") domChildren.push(child)
    else svgChildren.push(child)
  })

  const onMove = (clientX: number) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    ctx.setHoverIndex(ctx.indexAtX(clientX - rect.left - margins.left))
    ctx.setCursorX(clientX - rect.left)
  }

  return (
    <ChartContext value={ctx}>
      <div
        ref={ref}
        className={cn("relative h-full w-full", className)}
        onPointerEnter={() => ctx.setMouseInChart(true)}
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerLeave={() => {
          ctx.setMouseInChart(false)
          ctx.setHoverIndex(null)
        }}
      >
        {ctx.ready && backChildren.length > 0 && (
          <svg
            width={size.width}
            height={size.height}
            className="absolute inset-0 overflow-visible"
            aria-hidden
            role="presentation"
          >
            <g transform={`translate(${margins.left},${margins.top})`}>
              {backChildren}
            </g>
          </svg>
        )}
        <CartesianCanvas />
        {ctx.ready && (
          <svg
            width={size.width}
            height={size.height}
            className="absolute inset-0 overflow-visible"
            role="img"
            aria-label="Chart"
          >
            <g transform={`translate(${margins.left},${margins.top})`}>
              {svgChildren}
            </g>
          </svg>
        )}
        {domChildren}
      </div>
    </ChartContext>
  )
}
