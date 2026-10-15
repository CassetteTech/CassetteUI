"use client"

import { useChart } from "./chart-context"

export function YAxis({
  tickFormatter,
  tickCount = 4,
}: {
  tickFormatter?: (value: number) => string
  tickCount?: number
}) {
  const ctx = useChart("YAxis")
  if (!ctx.ready) return null

  return (
    <g className="fill-current font-mono text-[10px] text-muted-foreground">
      {ctx.y.ticks(tickCount).map((t) => (
        <text
          key={t}
          x={-8}
          y={ctx.y(t)}
          textAnchor="end"
          dominantBaseline="central"
          fill="currentColor"
        >
          {tickFormatter ? tickFormatter(t) : t}
        </text>
      ))}
    </g>
  )
}
