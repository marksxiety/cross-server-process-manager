import { useEffect, useState } from 'react'

export interface ChartTheme {
  text: string
  mutedText: string
  border: string
  tooltipBackground: string
  series: {
    cpu: string
    memory: string
    uptime: string
    restarts: string
    unstable: string
    status: string
  }
}

const FALLBACK_THEME: ChartTheme = {
  text: '#171717',
  mutedText: '#737373',
  border: '#e5e5e5',
  tooltipBackground: '#ffffff',
  series: {
    cpu: '#3b82f6',
    memory: '#8b5cf6',
    uptime: '#06b6d4',
    restarts: '#f59e0b',
    unstable: '#ef4444',
    status: '#22c55e',
  },
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

function readChartTheme(): ChartTheme {
  if (typeof document === 'undefined') return FALLBACK_THEME

  const styles = getComputedStyle(document.documentElement)

  return {
    text: readColor(styles, '--foreground', FALLBACK_THEME.text),
    mutedText: readColor(styles, '--muted-foreground', FALLBACK_THEME.mutedText),
    border: readColor(styles, '--border', FALLBACK_THEME.border),
    tooltipBackground: readColor(
      styles,
      '--popover',
      FALLBACK_THEME.tooltipBackground,
    ),
    series: FALLBACK_THEME.series,
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
    return () => observer.disconnect()
  }, [])

  return theme
}
