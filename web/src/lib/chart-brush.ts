export const MIN_BRUSH_SPAN_MS = 2_000

export type TimeSelection = {
  start: number
  end: number
}

function toFiniteNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

export function resolveBrushSelection(
  coordRange: unknown,
  minSpanMs = MIN_BRUSH_SPAN_MS,
): TimeSelection | null {
  const flat =
    Array.isArray(coordRange) && Array.isArray(coordRange[0])
      ? coordRange[0]
      : coordRange

  if (!Array.isArray(flat) || flat.length < 2) return null

  const first = toFiniteNumber(flat[0])
  const second = toFiniteNumber(flat[1])
  if (first === null || second === null) return null

  const start = Math.min(first, second)
  const end = Math.max(first, second)

  return end - start >= minSpanMs ? { start, end } : null
}

export function clampTimeRange(
  start: number,
  end: number,
  now = Date.now(),
  minSpanMs = MIN_BRUSH_SPAN_MS,
): TimeSelection | null {
  const first = toFiniteNumber(start)
  const second = toFiniteNumber(end)
  if (first === null || second === null) return null

  const lower = Math.max(0, Math.min(first, second))
  const upper = Math.min(now, Math.max(first, second))

  return upper - lower >= minSpanMs ? { start: lower, end: upper } : null
}
