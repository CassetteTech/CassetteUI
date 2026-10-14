"use client"

import { useChart } from "./chart-context"

export function XAxis({
  dataKey,
  maxTicks = 8,
}: {
  dataKey?: string
  maxTicks?: number
}) {
  const ctx = useChart("XAxis")
  if (!ctx.ready) return null

  const step = Math.max(1, Math.ceil(ctx.dataLength / maxTicks))
  const y = ctx.plot.height + 8

  return (
    <g className="fill-current font-mono text-[10px] text-muted-foreground">
      {ctx.data.map((row, i) => {
        if (i % step !== 0) return null
        const raw = dataKey ? row[dataKey] : i
        return (
          <text
            key={i}
            x={ctx.xCenter(i) ?? 0}
            y={y}
            textAnchor="middle"
            dominantBaseline="hanging"
            fill="currentColor"
          >
            {String(raw ?? "")}
          </text>
        )
      })}
    </g>
  )
}
