import { useState } from 'react'

// Shared by every "click to copy" affordance (address cells, trace sheet
// fields, ...) so the copied-checkmark timing/behavior stays identical
// everywhere instead of drifting between ad-hoc implementations.
export function useCopyToClipboard(resetDelayMs = 1500) {
  const [copied, setCopied] = useState(false)

  async function copy(value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), resetDelayMs)
  }

  return { copied, copy }
}
