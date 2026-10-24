import { useMemo } from 'react'
import type {
  CustomSeriesRenderItemAPI,
  CustomSeriesRenderItemParams,
  CustomSeriesRenderItemReturn,
} from 'echarts'
import type { EChartsCoreOption } from 'echarts/core'
import type { ChartTheme, ThresholdState } from '@/hooks/use-chart-theme'
import { formatUsagePercent } from '@/lib/server-usage'
import { EChart } from './echart'

export type UsageThresholds = {
  /** Total used (%) at which the state becomes "High". */
  warn: number
  /** Total used (%) at which the state becomes "Critical". */
  critical: number
}

const DEFAULT_USAGE_THRESHOLDS: UsageThresholds = {
  warn: 75,
  critical: 90,
}

export type UsageDonutProps = {
  theme: ChartTheme
  pm2: number
  other: number
  ariaLabel: string
  thresholds?: UsageThresholds
  className?: string
}

const STATE_LABEL: Record<ThresholdState, string> = {
  ok: 'OK',
  warn: 'High',
  critical: 'Critical',
}

function getUsageState(
  total: number,
  { warn, critical }: UsageThresholds,
): ThresholdState {
  if (total >= critical) return 'critical'
  if (total >= warn) return 'warn'
  return 'ok'
}

const CENTER_X = 0.5
const CENTER_Y = 0.45
const RING_RADIUS_RATIO = 0.84

const MARK_LINE_GAP = 2
const MARK_LINE_LENGTH = 6
const MARK_LABEL_GAP = 4

function asPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

const CENTER: [string, string] = [asPercent(CENTER_X), asPercent(CENTER_Y)]

function renderThresholdMark(
  _params: CustomSeriesRenderItemParams,
  api: CustomSeriesRenderItemAPI,
  theme: ChartTheme,
): CustomSeriesRenderItemReturn {
  const value = Number(api.value(0))
  const width = api.getWidth()
  const height = api.getHeight()
  const centerX = width * CENTER_X
  const centerY = height * CENTER_Y
  const radius = (Math.min(width, height) / 2) * RING_RADIUS_RATIO
  const angle = -Math.PI / 2 + (value / 100) * Math.PI * 2
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const lineStart = radius + MARK_LINE_GAP
  const lineEnd = lineStart + MARK_LINE_LENGTH
  const labelRadius = lineEnd + MARK_LABEL_GAP

  return {
    type: 'group',
    children: [
      {
        type: 'line',
        shape: {
          x1: centerX + cos * lineStart,
          y1: centerY + sin * lineStart,
          x2: centerX + cos * lineEnd,
          y2: centerY + sin * lineEnd,
        },
        style: { stroke: theme.mutedText, lineWidth: 1 },
      },
      {
        type: 'text',
        style: {
          text: String(Math.round(value)),
          x: centerX + cos * labelRadius,
          y: centerY + sin * labelRadius,
          fill: theme.mutedText,
          fontSize: 10,
          align: cos < -0.3 ? 'right' : cos > 0.3 ? 'left' : 'center',
          verticalAlign: sin < -0.3 ? 'bottom' : sin > 0.3 ? 'top' : 'middle',
        },
      },
    ],
  }
}

function buildOption(
  theme: ChartTheme,
  pm2: number,
  other: number,
  { warn, critical }: UsageThresholds,
): EChartsCoreOption {
  const total = Math.min(100, pm2 + other)
  const free = Math.max(0, 100 - pm2 - other)
  const state = getUsageState(total, { warn, critical })
  const stateColors = theme.threshold[state]

  // Active zone is solid, inactive zones are dimmed so the ring reads as a scale.
  const zone = (zoneState: ThresholdState) =>
    zoneState === state
      ? theme.threshold[zoneState].color
      : theme.threshold[zoneState].soft

  const legendValues: Record<string, number> = {
    'PM2 processes': pm2,
    'Other on host': other,
    Free: free,
  }

  return {
    animation: !theme.reducedMotion,
    animationDuration: 300,
    animationDurationUpdate: 300,
    animationEasingUpdate: 'cubicOut',
    title: {
      text: `{value|${formatUsagePercent(total)}}\n{chip|${STATE_LABEL[state]}}`,
      left: 'center',
      top: '34%',
      textStyle: {
        rich: {
          value: {
            fontSize: 28,
            fontWeight: 'bold',
            color: stateColors.text,
            lineHeight: 38,
            align: 'center',
          },
          chip: {
            fontSize: 11,
            fontWeight: 600,
            color: stateColors.text,
            backgroundColor: stateColors.soft,
            borderRadius: 10,
            padding: [3, 10],
            align: 'center',
          },
        },
      },
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: theme.tooltipBackground,
      borderColor: theme.border,
      borderWidth: 1,
      textStyle: { color: theme.text, fontSize: 11 },
      valueFormatter: (value: unknown) => formatUsagePercent(Number(value)),
    },
    legend: {
      bottom: 0,
      left: 'center',
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      data: Object.keys(legendValues),
      textStyle: { fontSize: 11, color: theme.mutedText },
      formatter: (name: string) =>
        `${name} ${formatUsagePercent(legendValues[name] ?? 0)}`,
    },
    series: [
      {
        // Threshold ring: a gauge with no pointer, used only for its axis line.
        id: 'usage-threshold',
        type: 'gauge',
        silent: true,
        center: CENTER,
        radius: asPercent(RING_RADIUS_RATIO),
        startAngle: 90,
        endAngle: -270,
        min: 0,
        max: 100,
        axisLine: {
          roundCap: false,
          lineStyle: {
            width: 5,
            color: [
              [warn / 100, zone('ok')],
              [critical / 100, zone('warn')],
              [1, zone('critical')],
            ],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        title: { show: false },
        detail: { show: false },
        data: [{ value: total }],
      },
      {
        id: 'server-usage',
        name: 'Server usage',
        type: 'pie',
        radius: ['50%', '72%'],
        center: CENTER,
        startAngle: 90,
        minAngle: 3,
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 0,
          borderColor: theme.tooltipBackground,
          borderWidth: 2,
        },
        label: { show: false },
        labelLine: { show: false },
        emphasis: { scale: false, label: { show: false } },
        data: [
          {
            value: pm2,
            name: 'PM2 processes',
            itemStyle: { color: theme.usage.pm2 },
          },
          {
            value: other,
            name: 'Other on host',
            itemStyle: { color: theme.usage.other },
          },
          {
            value: free,
            name: 'Free',
            itemStyle: { color: theme.usage.free },
          },
        ],
      },
      {
        // Threshold marks: leader line + value placed outside the gauge ring.
        id: 'usage-threshold-marks',
        type: 'custom',
        coordinateSystem: 'none',
        silent: true,
        animation: false,
        z: 10,
        data: [{ value: warn }, { value: critical }],
        renderItem: (
          params: CustomSeriesRenderItemParams,
          api: CustomSeriesRenderItemAPI,
        ) => renderThresholdMark(params, api, theme),
      },
    ],
  }
}

export function UsageDonut({
  theme,
  pm2,
  other,
  ariaLabel,
  thresholds = DEFAULT_USAGE_THRESHOLDS,
  className,
}: UsageDonutProps) {
  const { warn, critical } = thresholds

  const option = useMemo(
    () => buildOption(theme, pm2, other, { warn, critical }),
    [theme, pm2, other, warn, critical],
  )

  const total = Math.min(100, pm2 + other)
  const state = getUsageState(total, { warn, critical })

  return (
    <EChart
      option={option}
      ariaLabel={`${ariaLabel}, ${formatUsagePercent(total)} used, ${STATE_LABEL[state]}`}
      className={className}
      replaceSeries={false}
    />
  )
}
