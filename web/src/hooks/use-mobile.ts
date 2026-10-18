import * as React from "react"

const MOBILE_BREAKPOINT = 768 // Tailwind `md`
const TABLET_BREAKPOINT = 1024 // Tailwind `lg`

function useMediaQuery(query: string, serverFallback = false) {
  const subscribe = React.useCallback(
    (callback: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", callback)
      return () => mql.removeEventListener("change", callback)
    },
    [query],
  )

  const getSnapshot = () => window.matchMedia(query).matches
  const getServerSnapshot = () => serverFallback

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useIsMobile() {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
}

export function useIsTablet() {
  return useMediaQuery(
    `(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`,
  )
}

export function useIsDesktop() {
  return useMediaQuery(`(min-width: ${TABLET_BREAKPOINT}px)`)
}