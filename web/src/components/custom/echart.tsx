import { useEffect, useRef } from 'react'
import { LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import type { EChartsCoreOption } from 'echarts/core'
import { LegacyGridContainLabel } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import { cn } from '@/lib/utils'

echarts.use([
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  LegacyGridContainLabel,
  CanvasRenderer,
])

type EChartProps = {
  option: EChartsCoreOption
  ariaLabel: string
  className?: string
  replaceSeries?: boolean
}

export function EChart({
  option,
  ariaLabel,
  className,
  replaceSeries = true,
}: EChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const chart = echarts.init(element, undefined, { renderer: 'canvas' })
    chartRef.current = chart

    const resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(
      option,
      replaceSeries
        ? { replaceMerge: ['series'], lazyUpdate: true }
        : { lazyUpdate: true },
    )
  }, [option, replaceSeries])

  return (
    <div
      ref={containerRef}
      role='img'
      aria-label={ariaLabel}
      className={cn('h-48 w-full', className)}
    />
  )
}
