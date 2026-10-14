"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"
import { useChart } from "./chart-context"
import { prefersReducedMotion } from "./dither-paint"
import { rgb } from "./palette"

export function Tooltip({
  labelKey,
  valueFormatter,
}: {
  labelKey?: string
  valueFormatter?: (value: number, name: string) => string
}) {
  const chart = useChart("Tooltip")
  const show = chart.ready && chart.hoverIndex != null

  const [lastIndex, setLastIndex] = useState(0)
  if (chart.hoverIndex != null && chart.hoverIndex !== lastIndex) {
    setLastIndex(chart.hoverIndex)
  }
  const index = chart.hoverIndex ?? lastIndex

  const row = chart.data[index]
  const heading = labelKey ? String(row?.[labelKey] ?? "") : null
  const items = chart.configKeys.map((name) => {
    const raw = row?.[name]
    return {
      name,
      label: chart.config[name]?.label ?? name,
      value: typeof raw === "number" ? raw : 0,
      seed: chart.seedOf(name),
    }
  })

  const { margins } = chart
  const tooltipLeft = Math.max(
    48,
    Math.min(chart.plot.width + margins.left - 48, chart.cursorX)
  )
  const floor = margins.top + 44
  let tooltipTop = floor
  if (chart.hoverIndex != null) {
    let minY = Number.POSITIVE_INFINITY
    for (const key of chart.configKeys) {
      const b = chart.bands[key]?.[chart.hoverIndex]
      if (b) minY = Math.min(minY, chart.y(b[1]))
    }
    if (Number.isFinite(minY)) tooltipTop = Math.max(floor, margins.top + minY)
  }

  return (
    <AnimatePresence>
      {show && items.length > 0 && (
        <motion.div
          key="dither-tooltip"
          initial={{
            opacity: 0,
            x: "-50%",
            y: "-115%",
            top: tooltipTop,
            left: tooltipLeft,
          }}
          animate={{
            opacity: 1,
            x: "-50%",
            y: "-115%",
            top: tooltipTop,
            left: tooltipLeft,
          }}
          exit={{ opacity: 0 }}
          transition={
            prefersReducedMotion()
              ? { duration: 0 }
              : { type: "spring", stiffness: 520, damping: 38, mass: 0.6 }
          }
          className="pointer-events-none absolute z-10 rounded-md border bg-popover px-2 py-1 shadow-sm"
        >
          {heading && (
            <div className="mb-0.5 font-mono text-[10px] text-muted-foreground">
              {heading}
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            {items.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-1.5 font-mono text-[11px] text-popover-foreground tabular-nums"
              >
                <span
                  className="size-2 rounded-[1px]"
                  style={{ backgroundColor: rgb(item.seed.fill) }}
                />
                <span className="text-muted-foreground">{item.label}</span>
                <span className="ml-auto pl-2 text-foreground">
                  {valueFormatter
                    ? valueFormatter(item.value, item.name)
                    : item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

Tooltip.chartLayer = "dom" as const
