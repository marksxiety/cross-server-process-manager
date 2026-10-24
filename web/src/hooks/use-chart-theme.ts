import { useEffect, useState } from 'react'
import { STATUS_COLOR_VAR, STATUS_TEXT_COLOR_VAR } from '@/lib/status-chart'
import type { EffectiveStatus } from '@/types/process'

export type ThresholdState = 'ok' | 'warn' | 'critical'

export interface ThresholdColors {
  /** Ring zone color when this state is active. */
  color: string
  /** Dimmed ring zone (inactive) and chip background. */
  soft: string
  /** Text color on top of `soft` and for the big number. */
  text: string
}

export interface ChartTheme {
  text: string
  mutedText: string
  border: string
  tooltipBackground: string
  reducedMotion: boolean
  palette: string[]
  status: Record<EffectiveStatus, string>
  series: {
    cpu: string
    memory: string
    uptime: string
    restarts: string
    unstable: string
    status: string
  }
  usage: {
    pm2: string
    other: string
    free: string
  }
  threshold: Record<ThresholdState, ThresholdColors>
}

const THRESHOLD_STATUS: Record<ThresholdState, EffectiveStatus> = {
  ok: 'online',
  warn: 'waiting_restart',
  critical: 'errored',
}

const THRESHOLD_TRACK_VAR: Record<ThresholdState, string> = {
  ok: '--status-online-track',
  warn: '--status-waiting-restart-track',
  critical: '--status-errored-track',
}

const THRESHOLD_STATES: ThresholdState[] = ['ok', 'warn', 'critical']

const PALETTE_SIZE = 8

const FALLBACK_PALETTE = [
  '#155dfc',
  '#e17100',
  '#00a63e',
  '#c800de',
  '#0092b8',
  '#e7000b',
  '#4f39f6',
  '#e60076',
]

const FALLBACK_STATUS: Record<EffectiveStatus, string> = {
  errored: '#ef4444',
  failed_exit: '#f43f5e',
  degraded: '#f97316',
  waiting_restart: '#f59e0b',
  transitioning: '#0ea5e9',
  stopped_manual: '#64748b',
  scheduled_idle: '#8b5cf6',
  completed: '#14b8a6',
  online: '#10b981',
  unknown: '#94a3b8',
}

const FALLBACK_THRESHOLD: ChartTheme['threshold'] = {
  ok: { color: '#10b981', soft: '#a7f3d0', text: '#065f46' },
  warn: { color: '#f59e0b', soft: '#fde68a', text: '#b45309' },
  critical: { color: '#ef4444', soft: '#fecaca', text: '#b91c1c' },
}

const FALLBACK_THEME: ChartTheme = {
  text: '#171717',
  mutedText: '#737373',
  border: '#e5e5e5',
  tooltipBackground: '#ffffff',
  reducedMotion: false,
  palette: FALLBACK_PALETTE,
  status: FALLBACK_STATUS,
  series: {
    cpu: '#3b82f6',
    memory: '#8b5cf6',
    uptime: '#06b6d4',
    restarts: '#f59e0b',
    unstable: '#ef4444',
    status: '#22c55e',
  },
  usage: {
    pm2: '#8b5cf6',
    other: '#a1a1aa',
    free: '#e4e4e0',
  },
  threshold: FALLBACK_THRESHOLD,
}

let colorContext: CanvasRenderingContext2D | null | undefined

function getColorContext(): CanvasRenderingContext2D | null {
  if (colorContext !== undefined) return colorContext
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  colorContext = canvas.getContext('2d')
  return colorContext
}

/** Normalizes CSS colors (including oklch) to a canvas-compatible string. */
function normalizeColor(value: string, fallback: string): string {
  const context = getColorContext()
  if (!context || value.trim() === '') return fallback

  context.fillStyle = fallback
  context.fillStyle = value
  return context.fillStyle
}

function readColor(
  styles: CSSStyleDeclaration,
  property: string,
  fallback: string,
): string {
  return normalizeColor(styles.getPropertyValue(property), fallback)
}

function readPalette(styles: CSSStyleDeclaration): string[] {
  return Array.from({ length: PALETTE_SIZE }, (_, index) =>
    readColor(
      styles,
      `--chart-series-${index + 1}`,
      FALLBACK_PALETTE[index] ?? FALLBACK_PALETTE[0]!,
    ),
  )
}

function readStatusColors(styles: CSSStyleDeclaration): ChartTheme['status'] {
  return Object.fromEntries(
    (Object.keys(STATUS_COLOR_VAR) as EffectiveStatus[]).map((status) => [
      status,
      readColor(styles, STATUS_COLOR_VAR[status], FALLBACK_STATUS[status]),
    ]),
  ) as ChartTheme['status']
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function readThresholdColors(
  styles: CSSStyleDeclaration,
  status: ChartTheme['status'],
): ChartTheme['threshold'] {
  return Object.fromEntries(
    THRESHOLD_STATES.map((state) => {
      const statusKey = THRESHOLD_STATUS[state]

      return [
        state,
        {
          color: status[statusKey],
          soft: readColor(
            styles,
            THRESHOLD_TRACK_VAR[state],
            FALLBACK_THRESHOLD[state].soft,
          ),
          text: readColor(
            styles,
            STATUS_TEXT_COLOR_VAR[statusKey],
            FALLBACK_THRESHOLD[state].text,
          ),
        },
      ]
    }),
  ) as ChartTheme['threshold']
}

function readChartTheme(): ChartTheme {
  if (typeof document === 'undefined') return FALLBACK_THEME

  const styles = getComputedStyle(document.documentElement)
  const status = readStatusColors(styles)

  return {
    text: readColor(styles, '--foreground', FALLBACK_THEME.text),
    mutedText: readColor(styles, '--muted-foreground', FALLBACK_THEME.mutedText),
    border: readColor(styles, '--border', FALLBACK_THEME.border),
    tooltipBackground: readColor(
      styles,
      '--popover',
      FALLBACK_THEME.tooltipBackground,
    ),
    reducedMotion: prefersReducedMotion(),
    palette: readPalette(styles),
    status,
    series: FALLBACK_THEME.series,
    usage: {
      pm2: FALLBACK_THEME.usage.pm2,
      other: FALLBACK_THEME.usage.other,
      free: readColor(styles, '--border', FALLBACK_THEME.usage.free),
    },
    threshold: readThresholdColors(styles, status),
  }
}

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(readChartTheme)

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readChartTheme()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    const motion =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null
    const onMotionChange = () => setTheme(readChartTheme())
    motion?.addEventListener('change', onMotionChange)

    return () => {
      observer.disconnect()
      motion?.removeEventListener('change', onMotionChange)
    }
  }, [])

  return theme
}
