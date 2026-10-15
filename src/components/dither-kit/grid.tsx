"use client"

import { useChart } from "./chart-context"

export function Grid() {
  const ctx = useChart("Grid")
  if (!ctx.ready) return null
  const { width } = ctx.plot

  return (
    <g className="stroke-border" strokeDasharray="3 3">
      {ctx.y.ticks(4).map((t) => (
        <line key={`h-${t}`} x1={0} x2={width} y1={ctx.y(t)} y2={ctx.y(t)} />
      ))}
    </g>
  )
}

Grid.chartLayer = "back" as const
