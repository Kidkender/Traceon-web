// Converts a raw base-unit amount (e.g. wei-equivalent for an ERC-20) to a
// human-readable decimal string using the token's on-chain `decimals()`.
// Uses BigInt throughout to avoid float precision loss on large token
// amounts (18-decimal tokens routinely exceed Number.MAX_SAFE_INTEGER).
export function formatTokenAmount(raw: string, decimals: number): string {
  const negative = raw.startsWith('-')
  const digits = negative ? raw.slice(1) : raw
  const value = BigInt(digits)
  const base = 10n ** BigInt(decimals)
  const whole = value / base
  const fraction = (value % base).toString().padStart(decimals, '0').replace(/0+$/, '')
  const result = fraction ? `${whole}.${fraction}` : whole.toString()
  return negative ? `-${result}` : result
}

// Most ERC-20 tokens use 18 decimals (it mirrors ETH itself), so assuming
// 18 when the indexer hasn't resolved a token's real decimals() yet reads
// correctly far more often than showing the raw base-unit integer does.
// It's still a guess, not a fact — notably wrong for 6-decimal tokens like
// USDT/USDC — so every assumed render gets a `~` prefix, never presented
// as equal footing with a confirmed decimals() value.
export const ASSUMED_DECIMALS_FALLBACK = 18

export interface DisplayAmount {
  amount: string
  token_symbol?: string
  token_decimals?: number
}

// Shared by every place that renders a raw token_transfers amount (trace
// edges, wallet transfer lists, transaction detail) so the "assumed
// decimals" fallback and `~` marker stay identical everywhere instead of
// drifting between ad-hoc per-page implementations.
export function formatDisplayAmount(item: DisplayAmount): string {
  const decimals = item.token_decimals ?? ASSUMED_DECIMALS_FALLBACK
  const formatted = formatTokenAmount(item.amount, decimals)
  const prefix = item.token_decimals === undefined ? '~' : ''
  return item.token_symbol ? `${prefix}${formatted} ${item.token_symbol}` : `${prefix}${formatted}`
}
