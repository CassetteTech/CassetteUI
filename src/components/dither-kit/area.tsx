"use client"

import { useEffect } from "react"
import { type AreaVariant, useChart } from "./chart-context"

export function Area({
  dataKey,
  variant = "gradient",
}: {
  dataKey: string
  variant?: AreaVariant
}) {
  const ctx = useChart("Area")
  const { registerSeries, unregisterSeries } = ctx

  if (process.env.NODE_ENV !== "production" && !ctx.config[dataKey]) {
    console.warn(
      `<Area dataKey="${dataKey}" />: "${dataKey}" is not in the chart \`config\`. Add it so the series has a colour and label.`
    )
  }

  useEffect(() => {
    registerSeries(dataKey, variant)
    return () => unregisterSeries(dataKey)
  }, [dataKey, variant, registerSeries, unregisterSeries])

  return null
}
