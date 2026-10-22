import { useMemo } from 'react'
import type {
  CustomSeriesRenderItemAPI,
  CustomSeriesRenderItemParams,
  CustomSeriesRenderItemReturn,
} from 'echarts'
import type { EChartsCoreOption } from 'echarts/core'
import type { ChartTheme } from '@/hooks/use-chart-theme'
import { escapeHtml, formatUptime } from '@/lib/format'
import { STATUS_CHART_COLORS } from '@/lib/status-chart'
import { STATUS_CATALOG, STATUS_ORDER } from '@/lib/status-catalog'
import type {
  StatusTimelineData,
  StatusTimelineKind,
} from '@/types/prometheus'
import { EChart } from './echart'

export type StatusTimelineProps = {
  data: StatusTimelineData
  theme: ChartTheme
  ariaLabel: string
  className?: string
}

type StatusTimelineOptionInput = Omit<
  StatusTimelineProps,
  'ariaLabel' | 'className'
>

type TimelineDatum = {
  value: [number, number, number]
  laneLabel: string
  kind: StatusTimelineKind
  start: number
  end: number
}

type RestartDatum = {
  value: [number, number]
  laneLabel: string
  timestamp: number
}

type TooltipDatum = TimelineDatum | RestartDatum

type CoordinateSystem = {
  x: number
  y: number
  width: number
  height: number
}

function categoryHeight(
  api: CustomSeriesRenderItemAPI,
  factor: number,
): number {
  const size = api.size?.([0, 1])
  const height = Array.isArray(size) ? (size[1] ?? 1) : (size ?? 1)
  return Math.max(1, height * factor)
}

function renderStatusSegment(
  params: CustomSeriesRenderItemParams,
  api: CustomSeriesRenderItemAPI,
): CustomSeriesRenderItemReturn {
  const laneIndex = Number(api.value(0))
  const start = Number(api.value(1))
  const end = Number(api.value(2))
  const startPoint = api.coord([start, laneIndex])
  const endPoint = api.coord([end, laneIndex])
  const coord = params.coordSys as unknown as CoordinateSystem
  const laneHeight = categoryHeight(api, 0.7)
  const x = Math.max(coord.x, startPoint[0] ?? coord.x)
  const right = Math.min(coord.x + coord.width, endPoint[0] ?? x)

  if (right <= coord.x || x >= coord.x + coord.width) return null

  return {
    type: 'rect',
    shape: {
      x,
      y: (startPoint[1] ?? coord.y) - laneHeight / 2,
      width: Math.max(1, right - x),
      height: laneHeight,
      r: 1,
    },
    style: api.style(),
  }
}

function renderRestartMarker(
  params: CustomSeriesRenderItemParams,
  api: CustomSeriesRenderItemAPI,
  theme: ChartTheme,
): CustomSeriesRenderItemReturn {
  const laneIndex = Number(api.value(0))
  const timestamp = Number(api.value(1))
  const point = api.coord([timestamp, laneIndex])
  const coord = params.coordSys as unknown as CoordinateSystem
  const x = point[0] ?? coord.x
  const y = point[1] ?? coord.y

  if (x < coord.x || x > coord.x + coord.width) return null

  const laneHeight = categoryHeight(api, 0.9)

  return {
    type: 'line',
    shape: {
      x1: x,
      y1: y - laneHeight / 2,
      x2: x,
      y2: y + laneHeight / 2,
    },
    style: {
      stroke: theme.text,
      lineWidth: 1,
      lineDash: [2, 2],
    },
  }
}

function formatTooltip(params: unknown): string {
  const item = (Array.isArray(params) ? params[0] : params) as
    | { data?: TooltipDatum }
    | undefined
  const data = item?.data

  if (!data) return ''

  const lane = escapeHtml(data.laneLabel)

  if ('timestamp' in data) {
    return `${lane}<br/>Restart · ${escapeHtml(
      new Date(data.timestamp).toLocaleString(),
    )}`
  }

  const status =
    data.kind === 'no_data'
      ? 'No data'
      : `${STATUS_CATALOG[data.kind].label} (${STATUS_CATALOG[data.kind].code})`
  const range = `${new Date(data.start).toLocaleString()} – ${new Date(
    data.end,
  ).toLocaleString()}`
  const duration = formatUptime(Math.max(1, data.end - data.start))

  return [
    lane,
    escapeHtml(status),
    escapeHtml(range),
    escapeHtml(duration),
  ].join('<br/>')
}

function buildStatusTimelineOption({
  data,
  theme,
}: StatusTimelineOptionInput): EChartsCoreOption {
  const series: Record<string, unknown>[] = []

  for (const status of STATUS_ORDER) {
    const segments = data.segments.filter((segment) => segment.kind === status)
    if (segments.length === 0) continue

    series.push({
      type: 'custom',
      name: STATUS_CATALOG[status].label,
      itemStyle: { color: STATUS_CHART_COLORS[status] },
      encode: { x: [1, 2], y: 0 },
      data: segments.map((segment) => ({
        value: [segment.laneIndex, segment.start, segment.end],
        laneLabel:
          data.lanes[segment.laneIndex]?.label ?? STATUS_CATALOG[status].label,
        kind: status,
        start: segment.start,
        end: segment.end,
      })),
      renderItem: renderStatusSegment,
      z: 2,
    })
  }

  const noDataSegments = data.segments.filter(
    (segment) => segment.kind === 'no_data',
  )
  if (noDataSegments.length > 0) {
    series.push({
      type: 'custom',
      name: 'No data',
      itemStyle: {
        color: theme.mutedText,
        opacity: 0.25,
      },
      encode: { x: [1, 2], y: 0 },
      data: noDataSegments.map((segment) => ({
        value: [segment.laneIndex, segment.start, segment.end],
        laneLabel: data.lanes[segment.laneIndex]?.label ?? 'Unknown',
        kind: 'no_data',
        start: segment.start,
        end: segment.end,
      })),
      renderItem: renderStatusSegment,
      z: 1,
    })
  }

  if (data.restarts.length > 0) {
    series.push({
      type: 'custom',
      name: 'Restart',
      itemStyle: { color: theme.text },
      encode: { x: 1, y: 0 },
      data: data.restarts.map((restart) => ({
        value: [restart.laneIndex, restart.timestamp],
        laneLabel: data.lanes[restart.laneIndex]?.label ?? 'Unknown',
        timestamp: restart.timestamp,
      })),
      renderItem: (
        params: CustomSeriesRenderItemParams,
        api: CustomSeriesRenderItemAPI,
      ) => renderRestartMarker(params, api, theme),
      z: 3,
    })
  }

  const showLegend = series.length > 0

  return {
    animation: false,
    grid: {
      left: 8,
      right: 14,
      top: 12,
      bottom: showLegend ? 42 : 6,
      containLabel: true,
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: theme.tooltipBackground,
      borderColor: theme.border,
      borderWidth: 1,
      textStyle: { color: theme.text, fontSize: 11 },
      formatter: formatTooltip,
    },
    legend: showLegend
      ? {
          type: 'scroll',
          bottom: 0,
          left: 0,
          right: 0,
          itemWidth: 8,
          itemHeight: 8,
          icon: 'roundRect',
          textStyle: { color: theme.mutedText, fontSize: 10 },
        }
      : undefined,
    xAxis: {
      type: 'time',
      min: data.start,
      max: data.end,
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
      axisLabel: { color: theme.mutedText, fontSize: 10, hideOverlap: true },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'category',
      data: data.lanes.map((lane) => lane.label),
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: theme.mutedText,
        fontSize: 10,
        interval: 0,
        width: 140,
        overflow: 'truncate',
      },
      splitLine: { show: false },
    },
    series,
  }
}

export function StatusTimeline({
  data,
  theme,
  ariaLabel,
  className,
}: StatusTimelineProps) {
  const option = useMemo(
    () => buildStatusTimelineOption({ data, theme }),
    [data, theme],
  )

  return <EChart option={option} ariaLabel={ariaLabel} className={className} />
}
