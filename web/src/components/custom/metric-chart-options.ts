import type { EChartsCoreOption } from 'echarts/core'
import type { ChartTheme } from '@/hooks/use-chart-theme'
import type { MetricChartSeries } from '@/types/prometheus'

export interface LineChartOptionInput {
  series: MetricChartSeries[]
  theme: ChartTheme
  valueFormatter: (value: number | string) => string
  yAxisFormatter?: (value: number) => string
  yAxisMax?: number
  yAxisCategories?: string[]
}

export function buildLineOption({
  series,
  theme,
  valueFormatter,
  yAxisFormatter,
  yAxisMax,
  yAxisCategories,
}: LineChartOptionInput): EChartsCoreOption {
  const showLegend = series.length > 1

  return {
    animation: true,
    animationDuration: 300,
    animationDurationUpdate: 300,
    animationEasingUpdate: 'cubicOut',
    grid: {
      left: 8,
      right: 14,
      top: 12,
      bottom: showLegend ? 42 : 6,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      ...tooltipStyle(theme),
      formatter: (params: unknown) =>
        formatLineTooltip(params, valueFormatter),
      axisPointer: {
        type: 'line',
        lineStyle: { color: theme.mutedText, opacity: 0.35 },
      },
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
    xAxis: timeAxis(theme),
    yAxis: yAxisCategories
      ? {
          type: 'category',
          data: yAxisCategories,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: theme.mutedText, fontSize: 10 },
          splitLine: splitLineStyle(theme),
        }
      : {
          type: 'value',
          min: 0,
          max: yAxisMax,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: theme.mutedText,
            fontSize: 10,
            formatter: yAxisFormatter,
          },
          splitLine: splitLineStyle(theme),
        },
    series: series.map((entry) => ({
      id: entry.id,
      name: entry.name,
      type: 'line',
      data: entry.points,
      encode: { x: 0, y: 1 },
      showSymbol: false,
      step: entry.stepped ? 'end' : false,
      lineStyle: {
        width: 1.5,
        color: entry.color,
        type: entry.dashed ? 'dashed' : 'solid',
      },
      itemStyle: { color: entry.color },
      areaStyle: entry.filled
        ? { color: entry.color, opacity: 0.08 }
        : undefined,
      emphasis: { focus: 'series' },
    })),
  }
}

function timeAxis(theme: ChartTheme) {
  return {
    type: 'time',
    axisLine: { lineStyle: { color: theme.border } },
    axisTick: { show: false },
    axisLabel: { color: theme.mutedText, fontSize: 10, hideOverlap: true },
    splitLine: { show: false },
  }
}

function splitLineStyle(theme: ChartTheme) {
  return { lineStyle: { color: theme.border, opacity: 0.5 } }
}

function tooltipStyle(theme: ChartTheme) {
  return {
    backgroundColor: theme.tooltipBackground,
    borderColor: theme.border,
    borderWidth: 1,
    textStyle: { color: theme.text, fontSize: 11 },
  }
}

function formatLineTooltip(
  params: unknown,
  valueFormatter: (value: number | string) => string,
): string {
  const items = Array.isArray(params) ? params : [params]
  if (items.length === 0) return ''

  const first = items[0] as {
    axisValue?: unknown
    axisValueLabel?: unknown
  }
  const timestamp = Number(first.axisValue)
  const title = Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleString()
    : String(first.axisValueLabel ?? '')

  const rows: string[] = []
  for (const item of items) {
    const entry = item as {
      marker?: string
      seriesName?: string
      value?: unknown
    }
    const raw = Array.isArray(entry.value) ? entry.value[1] : entry.value
    const formatted = valueFormatter(raw as number | string)

    rows.push(
      `${entry.marker ?? ''}${escapeHtml(entry.seriesName ?? '')}: ${escapeHtml(
        formatted,
      )}`,
    )
  }

  return [escapeHtml(title), ...rows]
    .filter((line) => line !== '')
    .join('<br/>')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
