import { useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'

const FLIP_DURATION_MS = 220
const FLIP_EASING = 'cubic-bezier(0.2, 0, 0, 1)'

type RelativePosition = {
  left: number
  top: number
}

type FlipReorderOptions = {
  /** Element containing the reorderable items; each item marks itself with data-flip-key. */
  containerRef: RefObject<HTMLElement | null>
  /** Changes whenever the visual order changes, e.g. the joined list of item keys. */
  orderSignature: string
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * FLIP animation for lists that reorder on data refresh: each item is measured
 * relative to its container before the order changes (previous layout effect),
 * then translated back to its old position so the browser can animate it into
 * the new slot with the Web Animations API.
 */
export function useFlipReorder({ containerRef, orderSignature }: FlipReorderOptions) {
  const previousPositions = useRef<Map<string, RelativePosition>>(new Map())
  const previousSignature = useRef(orderSignature)
  const animations = useRef<Map<string, Animation>>(new Map())

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const nextPositions = new Map<string, RelativePosition>()
    const shouldAnimate =
      previousSignature.current !== orderSignature && !prefersReducedMotion()

    container.querySelectorAll<HTMLElement>('[data-flip-key]').forEach((element) => {
      const key = element.dataset.flipKey
      if (!key) return

      const rect = element.getBoundingClientRect()
      const nextPosition = {
        left: rect.left - containerRect.left,
        top: rect.top - containerRect.top,
      }
      nextPositions.set(key, nextPosition)

      const previous = previousPositions.current.get(key)
      if (!shouldAnimate || !previous) return

      const deltaX = previous.left - nextPosition.left
      const deltaY = previous.top - nextPosition.top
      if (deltaX === 0 && deltaY === 0) return

      animations.current.get(key)?.cancel()
      const animation = element.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: 'translate(0, 0)' },
        ],
        { duration: FLIP_DURATION_MS, easing: FLIP_EASING },
      )
      animations.current.set(key, animation)
      animation.addEventListener('finish', () => {
        if (animations.current.get(key) === animation) animations.current.delete(key)
      })
    })

    previousPositions.current = nextPositions
    previousSignature.current = orderSignature
  }, [containerRef, orderSignature])
}
