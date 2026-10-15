"use client"

import type { ScaleLinear } from "d3-scale"
import { createContext, use, useCallback, useMemo, useState } from "react"
import type { DitherColor, Seed } from "./palette"
import { seedOfColor } from "./palette"
import { buildXScale, buildYScale, computeBands, nearestIndex } from "./scales"
import type { Dimensions } from "./use-chart-dimensions"

export type ChartConfig = Record<string, { label?: string; color: DitherColor }>

export type Margins = {
  top: number
  right: number
  bottom: number
  left: number
}

export type AreaVariant = "gradient" | "dotted" | "hatched"

export type ChartContextValue = {
  config: ChartConfig
  configKeys: string[]
  data: object[]
  dataLength: number

  margins: Margins
  plot: { width: number; height: number }
  ready: boolean

  xCenter: (index: number) => number
  indexAtX: (px: number) => number
  y: ScaleLinear<number, number>
  bands: Record<string, [number, number][]>

  hoverIndex: number | null
  setHoverIndex: (index: number | null) => void
  cursorX: number
  setCursorX: (px: number) => void
  isMouseInChart: boolean
  setMouseInChart: (over: boolean) => void

  variants: Record<string, AreaVariant>
  registerSeries: (dataKey: string, variant: AreaVariant) => void
  unregisterSeries: (dataKey: string) => void

  animate: boolean
  revision: number

  seedOf: (key: string) => Seed
}

const ChartContext = createContext<ChartContextValue | null>(null)

export function useChart(part: string): ChartContextValue {
  const ctx = use(ChartContext)
  if (!ctx) {
    throw new Error(`<${part} /> must be used within <AreaChart />.`)
  }
  return ctx
}

export { ChartContext }

/** A counter that advances whenever `data` changes identity — drives entrance
 * replays without remounting. Uses the adjust-state-during-render pattern
 * (https://react.dev/reference/react/useState) instead of a ref: the revision is
 * derived purely from render inputs, so it stays consistent across the memoized
 * values below rather than lagging a render behind. */
function useRevision(data: unknown) {
  const [prev, setPrev] = useState({ data, revision: 0 })
  if (prev.data !== data) {
    const next = { data, revision: prev.revision + 1 }
    setPrev(next)
    return next.revision
  }
  return prev.revision
}

export function useChartController({
  data,
  config,
  yMax,
  dimensions,
  margins,
  animate,
}: {
  data: object[]
  config: ChartConfig
  yMax?: number
  dimensions: Dimensions
  margins: Margins
  animate: boolean
}): ChartContextValue {
  const configKeys = useMemo(() => Object.keys(config), [config])
  const revision = useRevision(data)

  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [cursorX, setCursorX] = useState(0)
  const [isMouseInChart, setMouseInChart] = useState(false)
  const [variants, setVariants] = useState<Record<string, AreaVariant>>({})

  // useCallback because the series effect in area.tsx lists these as deps —
  // without stable identities the unregister/register effect re-fires every
  // render and its setState pair loops ("Maximum update depth exceeded").
  const registerSeries = useCallback((dataKey: string, variant: AreaVariant) => {
    setVariants((prev) =>
      prev[dataKey] === variant ? prev : { ...prev, [dataKey]: variant }
    )
  }, [])
  const unregisterSeries = useCallback((dataKey: string) => {
    setVariants((prev) => {
      if (!(dataKey in prev)) return prev
      const next = { ...prev }
      delete next[dataKey]
      return next
    })
  }, [])

  const plotWidth = Math.max(0, dimensions.width - margins.left - margins.right)
  const plotHeight = Math.max(0, dimensions.height - margins.top - margins.bottom)
  const ready = plotWidth > 0 && plotHeight > 0

  const { bands, max, min } = useMemo(
    () => computeBands(data, configKeys),
    [data, configKeys]
  )

  const xPoint = useMemo(
    () => buildXScale(data.length, plotWidth),
    [data.length, plotWidth]
  )
  const xCenter = useCallback((i: number) => xPoint(i) ?? 0, [xPoint])
  const indexAtX = useCallback(
    (px: number) => nearestIndex(px, data.length, plotWidth),
    [data.length, plotWidth]
  )
  const y = useMemo(
    () => buildYScale(min, max, plotHeight, yMax),
    [min, max, plotHeight, yMax]
  )

  const seedOf = useCallback(
    (key: string) => seedOfColor(config[key]?.color ?? "grey"),
    [config]
  )

  return useMemo<ChartContextValue>(
    () => ({
      config,
      configKeys,
      data,
      dataLength: data.length,
      margins,
      plot: { width: plotWidth, height: plotHeight },
      ready,
      xCenter,
      indexAtX,
      y,
      bands,
      hoverIndex,
      setHoverIndex,
      cursorX,
      setCursorX,
      isMouseInChart,
      setMouseInChart,
      variants,
      registerSeries,
      unregisterSeries,
      animate,
      revision,
      seedOf,
    }),
    [
      config,
      configKeys,
      data,
      margins,
      plotWidth,
      plotHeight,
      ready,
      xCenter,
      indexAtX,
      y,
      bands,
      hoverIndex,
      cursorX,
      isMouseInChart,
      variants,
      registerSeries,
      unregisterSeries,
      animate,
      revision,
      seedOf,
    ]
  )
}
