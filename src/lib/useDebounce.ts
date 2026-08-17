import { useEffect, useState } from 'react'

// Delays a fast-changing value (keystrokes) so dependents — the search
// suggestions query below — don't fire on every keystroke, only once
// typing pauses.
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])

  return debounced
}
