import { useEffect, useRef } from 'react'
import { CustomChart, GaugeChart, LineChart, PieChart } from 'echarts/charts'
import {
  AriaComponent,
  BrushComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import type { EChartsCoreOption } from 'echarts/core'
import { LegacyGridContainLabel } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import { resolveBrushSelection } from '@/lib/chart-brush'
import { cn } from '@/lib/utils'
import { TIME_SERIES_BRUSH } from './chart-config'

echarts.use([
  AriaComponent,
  BrushComponent,
  CustomChart,
  GaugeChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  LegacyGridContainLabel,
  CanvasRenderer,
])

type ChartInstance = ReturnType<typeof echarts.init>

type BrushArea = {
  coordRange?: unknown
  range?: unknown
}

export type EChartSelection = {
  enabled: boolean
  onSelect?: (start: number, end: number) => void
  onReset?: () => void
}

export type EChartProps = {
  option: EChartsCoreOption
  ariaLabel: string
  className?: string
  replaceSeries?: boolean
  selection?: EChartSelection
}

function armBrush(chart: ChartInstance) {
  if (chart.isDisposed()) return

  chart.dispatchAction({
    type: 'takeGlobalCursor',
    key: 'brush',
    brushOption: { brushType: 'lineX', brushMode: 'single' },
  })
}

function axisValue(value: number | number[]): number {
  return Array.isArray(value) ? value[0] : value
}

export function EChart({
  option,
  ariaLabel,
  className,
  replaceSeries = true,
  selection,
}: EChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<ChartInstance | null>(null)
  const selectionRef = useRef<EChartSelection | undefined>(selection)

  useEffect(() => {
    selectionRef.current = selection
  }, [selection])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const chart = echarts.init(element, undefined, { renderer: 'canvas' })
    chartRef.current = chart

    const handleBrushEnd = (params: unknown) => {
      const current = selectionRef.current
      if (!current?.enabled) return

      const areas = (params as { areas?: BrushArea[] }).areas
      const area = areas?.[0]
      if (!area) return

      chart.dispatchAction({
        type: 'brush',
        command: 'clear',
        areas: [],
      })

      const pixelRange =
        !area.coordRange && Array.isArray(area.range)
          ? (area.range as unknown[])
          : null
      const coordRange =
        area.coordRange ??
        (pixelRange && pixelRange.length >= 2
          ? [
              axisValue(
                chart.convertFromPixel(
                  { xAxisIndex: 0 },
                  Number(pixelRange[0]),
                ),
              ),
              axisValue(
                chart.convertFromPixel(
                  { xAxisIndex: 0 },
                  Number(pixelRange[1]),
                ),
              ),
            ]
          : undefined)

      const resolved = resolveBrushSelection(coordRange)
      if (resolved !== null) {
        current.onSelect?.(resolved.start, resolved.end)
      }

      requestAnimationFrame(() => {
        if (selectionRef.current?.enabled) armBrush(chart)
      })
    }

    const zr = chart.getZr()
    const handleDoubleClick = () => {
      const current = selectionRef.current
      if (!current?.enabled) return

      chart.dispatchAction({
        type: 'brush',
        command: 'clear',
        areas: [],
      })
      current.onReset?.()
    }

    const resizeObserver = new ResizeObserver(() => {
      chart.resize()
      if (selectionRef.current?.enabled) armBrush(chart)
    })

    chart.on('brushEnd', handleBrushEnd)
    zr.on('dblclick', handleDoubleClick)
    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
      chart.off('brushEnd', handleBrushEnd)
      zr.off('dblclick', handleDoubleClick)
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    const nextOption = selection?.enabled
      ? { ...option, brush: TIME_SERIES_BRUSH }
      : option

    chart.setOption(
      nextOption,
      replaceSeries
        ? { replaceMerge: ['series'], lazyUpdate: true }
        : { lazyUpdate: true },
    )

    if (selection?.enabled) armBrush(chart)
  }, [option, replaceSeries, selection?.enabled])

  return (
    <div
      ref={containerRef}
      role='img'
      aria-label={ariaLabel}
      className={cn(
        'h-48 w-full',
        selection?.enabled && 'cursor-crosshair',
        className,
      )}
    />
  )
}
