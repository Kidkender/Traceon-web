// Prices/values under $1 (small-cap coins, memecoins, dust holdings) need
// more decimal places to show anything meaningful at all — 2 fixed places
// would render as $0.00.
export function formatUsd(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1 ? 2 : 6,
  })
}
