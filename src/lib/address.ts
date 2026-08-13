const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/

export function isValidAddress(value: string): boolean {
  return ADDRESS_PATTERN.test(value.trim())
}

export function shortenAddress(address: string): string {
  if (!isValidAddress(address)) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}
