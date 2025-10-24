"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

type ChartConfig = Record<
  string,
  {
    label?: string
    color?: string
    icon?: React.ComponentType<{ className?: string }>
  }
>

const ChartContext = React.createContext<{ config: ChartConfig }>({ config: {} })

export function ChartContainer({
  config,
  className,
  children,
}: {
  config: ChartConfig
  className?: string
  children: React.ReactNode
}) {
  return (
    <ChartContext.Provider value={{ config }}>
      <div className={className}>{children}</div>
    </ChartContext.Provider>
  )
}

export const ChartTooltip = RechartsPrimitive.Tooltip

export function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: any
  label?: string
}) {
  const { config } = React.useContext(ChartContext)
  const safePayload = Array.isArray(payload) ? payload : []

  if (!active || !safePayload.length) return null

  return (
    <div className="rounded-md bg-background p-2 shadow-md">
      <div className="font-medium text-sm mb-1">{label}</div>
      {safePayload.map((item: any, index: number) => {
        const key = item.dataKey || `value-${index}`
        const conf = config[key] || {}
        const color = conf.color || item.color
        return (
          <div key={key} className="flex items-center justify-between text-xs mb-0.5">
            <span className="flex items-center">
              <span
                className="inline-block w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: color }}
              />
              {conf.label || key}
            </span>
            <span>{item.value}</span>
          </div>
        )
      })}
    </div>
  )
}

export function ChartLegendContent({
  payload,
}: {
  payload?: any[]
}) {
  const { config } = React.useContext(ChartContext)
  const safePayload = Array.isArray(payload) ? payload : []

  if (!safePayload.length) return null

  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {safePayload.map((item: any, index: number) => {
        const key = item.dataKey || `legend-${index}`
        const conf = config[key] || {}
        const color = conf.color || item.color
        return (
          <li key={key} className="flex items-center">
            <span
              className="inline-block w-2 h-2 rounded-full mr-1"
              style={{ backgroundColor: color }}
            />
            {conf.label || key}
          </li>
        )
      })}
    </ul>
  )
}

export const Chart = Object.assign({}, RechartsPrimitive)
