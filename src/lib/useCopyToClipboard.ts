import { useState } from 'react'
import { toast } from '@/components/ui/toast'

// Shared by every "click to copy" affordance (address cells, trace sheet
// fields, ...) so the copied-checkmark timing/behavior — and now the toast
// confirmation — stays identical everywhere instead of drifting between
// ad-hoc implementations. The checkmark swap alone is easy to miss (small,
// silent, only visible if you're looking right at the button); the toast
// gives every copy a confirmation you'll notice even if you've already
// looked away.
export function useCopyToClipboard(resetDelayMs = 1500) {
  const [copied, setCopied] = useState(false)

  async function copy(value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    toast.add({ title: 'Copied to clipboard', type: 'success', timeout: 2000 })
    setTimeout(() => setCopied(false), resetDelayMs)
  }

  return { copied, copy }
}
