const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: PaginationMeta
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface Paginated<T> {
  items: T[]
  meta: PaginationMeta
}

export class ApiError extends Error {
  code: string

  constructor(code: string) {
    super(code)
    this.code = code
  }
}

async function request<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(API_BASE_URL + path)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }

  const res = await fetch(url.toString())
  const body: ApiResponse<T> = await res.json()

  if (!res.ok || !body.success) {
    throw new ApiError(body.error ?? 'error.unknown')
  }
  return body.data as T
}

async function requestPaginated<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<Paginated<T>> {
  const url = new URL(API_BASE_URL + path)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }

  const res = await fetch(url.toString())
  const body: ApiResponse<T[]> = await res.json()

  if (!res.ok || !body.success) {
    throw new ApiError(body.error ?? 'error.unknown')
  }
  return { items: body.data ?? [], meta: body.meta! }
}

export interface WalletOverview {
  address: string
  type: string
  transaction_count: number
  first_seen_block: number
  last_seen_block: number
  contract_name?: string
}

export interface TransactionSummary {
  hash: string
  block_number: number
  from_address: string
  to_address: string
  value: string
  status: string
  timestamp: string
}

export interface TokenTransferSummary {
  transaction_hash: string
  token_address: string
  token_symbol?: string
  // Undefined means the indexer hasn't resolved this token's real
  // decimals() yet — same convention as TraceEdge.token_decimals.
  token_decimals?: number
  from_address: string
  to_address: string
  amount: string
  timestamp: string
}

export interface TransactionDetail extends Omit<TransactionSummary, 'value'> {
  value: string
  gas: number
  gas_price: string
  gas_used: number
  token_transfers: TokenTransferSummary[]
}

export interface TokenHolding {
  chain_id: number
  token_address?: string
  token_name: string
  token_symbol: string
  balance: string
  decimals: number
  usd_value?: number
}

export interface StatsOverview {
  chain_id: number
  total_transactions: number
  total_addresses: number
  total_entities: number
  latest_block: number
  latest_block_time?: string
}

export interface FeedItem {
  chain_id: number
  hash: string
  from_address: string
  to_address: string
  token_name: string
  token_symbol: string
  token_address?: string
  amount: string
  decimals: number
  usd_value?: number
  timestamp: string
}

export interface FeedPage {
  items: FeedItem[]
  page: number
  limit: number
  has_next: boolean
}

export type FeedKind = 'native' | 'token' | undefined
export type FeedSort = 'newest' | 'oldest'

export interface FeedQuery {
  // undefined = every supported chain — the recent-activity feed filters
  // independently of the global network switcher, not from it.
  chainId?: number
  kind?: FeedKind
  sort?: FeedSort
  page?: number
  limit?: number
}

export interface CoinPrice {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  price_change_percentage_24h: number
  market_cap: number
}

export type TraceDirection = 'out' | 'in' | 'all'

export interface TraceQuery {
  direction?: TraceDirection
  depth?: number
  min_value?: string
  asset?: string
  max_nodes?: number
  max_edges?: number
}

export const FLAG_POTENTIAL_FUND_FORWARDING = 'potential_fund_forwarding'
export const FLAG_POTENTIAL_WALLET_CLUSTER = 'potential_wallet_cluster'

export interface EntitySummary {
  id: number
  name: string
  type: string
  description: string
  confidence: number
}

export interface LabelSummary {
  id: number
  name: string
}

export interface TraceNode {
  address: string
  flags?: string[]
  entity?: EntitySummary
  labels?: LabelSummary[]
}

export interface TraceEdge {
  from: string
  to: string
  token_address: string
  token_symbol?: string
  token_decimals?: number
  amount: string
  transaction_hash: string
  block_number: number
  timestamp: string
}

export interface TraceResult {
  root_address: string
  nodes: TraceNode[]
  edges: TraceEdge[]
  truncated: boolean
}

// Every call below takes the caller's currently-selected chain_id (see
// useNetwork()/NetworkProvider) so wallet/transaction/trace data always
// scopes to the network the user picked, instead of implicitly assuming
// Ethereum. The backend defaults chain_id to 1 when omitted, but call
// sites should always pass it explicitly now that multiple chains exist.
export const api = {
  getWalletOverview: (address: string, chainId: number) =>
    request<WalletOverview>(`/wallets/${address}`, { chain_id: chainId }),

  listWalletTransactions: (address: string, page: number, limit: number, chainId: number) =>
    requestPaginated<TransactionSummary>(`/wallets/${address}/transactions`, { page, limit, chain_id: chainId }),

  listWalletTransfers: (address: string, page: number, limit: number, chainId: number) =>
    requestPaginated<TokenTransferSummary>(`/wallets/${address}/transfers`, { page, limit, chain_id: chainId }),

  // No chainId param, unlike everything else here — holdings always
  // covers every chain the backend has an RPC endpoint for (see
  // HoldingsService), independent of whichever chain is selected in the
  // header's network switcher.
  getWalletHoldings: (address: string) => request<TokenHolding[]>(`/wallets/${address}/holdings`),

  getTransaction: (hash: string, chainId: number) =>
    request<TransactionDetail>(`/transactions/${hash}`, { chain_id: chainId }),

  trace: (address: string, query: TraceQuery, chainId: number) =>
    request<TraceResult>(`/trace/${address}`, { ...query, chain_id: chainId }),

  getStats: (chainId: number) => request<StatsOverview>('/stats', { chain_id: chainId }),

  listLatestTransactions: (query: FeedQuery) =>
    request<FeedPage>('/transactions/latest', {
      chain_id: query.chainId,
      kind: query.kind,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
    }),

  getTopCoins: () => request<CoinPrice[]>('/prices/top'),
}
