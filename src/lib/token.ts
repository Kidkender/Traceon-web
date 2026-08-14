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
