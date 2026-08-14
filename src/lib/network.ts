// Chain IDs mirror the Go backend's internal/config.SupportedChainIDs — keep
// these two lists in sync if a new chain is ever added.
export type ChainId = 1 | 56

export interface NetworkInfo {
  id: ChainId
  name: string
  shortName: string
}

export const NETWORKS: NetworkInfo[] = [
  { id: 1, name: 'Ethereum Mainnet', shortName: 'Ethereum' },
  { id: 56, name: 'BNB Smart Chain', shortName: 'BNB Chain' },
]

export const DEFAULT_CHAIN_ID: ChainId = 1

export function isChainId(value: number): value is ChainId {
  return NETWORKS.some((n) => n.id === value)
}

export function getNetwork(chainId: ChainId): NetworkInfo {
  return NETWORKS.find((n) => n.id === chainId) ?? NETWORKS[0]
}
