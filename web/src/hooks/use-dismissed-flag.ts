import { useCallback, useState } from 'react'

export function useDismissedFlag(storageKey: string) {
  const [isDismissed, setIsDismissed] = useState(
    () => localStorage.getItem(storageKey) === 'true',
  )

  const dismiss = useCallback(() => {
    localStorage.setItem(storageKey, 'true')
    setIsDismissed(true)
  }, [storageKey])

  return { isDismissed, dismiss }
}
