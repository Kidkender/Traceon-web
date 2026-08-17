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
  entity?: EntitySummary
  latest_transaction_at?: string
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
  from_entity_name?: string
  to_entity_name?: string
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
export type FeedSortBy = 'timestamp' | 'from_address' | 'to_address' | 'amount'
export type FeedSortDir = 'asc' | 'desc'

export interface FeedQuery {
  // undefined = every supported chain — the recent-activity feed has its
  // own independent chain filter, not tied to any other page's chain state.
  chainId?: number
  kind?: FeedKind
  sortBy?: FeedSortBy
  sortDir?: FeedSortDir
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
  // RFC3339 timestamps, both optional — unbounded on whichever side is
  // omitted. Backend rejects a malformed value rather than ignoring it.
  from?: string
  to?: string
  max_nodes?: number
  max_edges?: number
}

// SearchEntityInfo mirrors the backend's leaner dto.SearchEntityInfo, not
// the full EntitySummary below — a search hit only carries enough to render
// a suggestion row (name + type), not description/confidence/every address.
export interface SearchEntityInfo {
  id: number
  name: string
  type: string
}

export interface SearchResultItem {
  address: string
  entity?: SearchEntityInfo
  chains?: number[]
}

export const FLAG_POTENTIAL_FUND_FORWARDING = 'potential_fund_forwarding'
export const FLAG_POTENTIAL_WALLET_CLUSTER = 'potential_wallet_cluster'

// One address tagged to an entity, with the chain it was confirmed on — an
// entity commonly has different addresses per chain (e.g. an exchange's
// Ethereum hot wallet vs its BSC one), so a bare address string alone isn't
// enough to route to the right /address/:address page.
export interface EntityAddressInfo {
  address: string
  chain_id: number
  // This specific address's attribution to the entity — independent of
  // EntitySummary.confidence below (confidence in the entity record
  // itself), since two addresses on the same entity can be sourced
  // differently (one official disclosure, one heuristic guess).
  source: string
  confidence: number
}

export interface EntitySummary {
  id: number
  name: string
  type: string
  description: string
  confidence: number
  // Set only when this summary is attached to one specific address
  // (WalletOverview.entity, TraceNode.entity) — the address→entity
  // attribution's own source/confidence, distinct from `confidence` above.
  // Empty on getEntity()'s multi-address summary, which has no single
  // address for them to describe.
  source?: string
  source_confidence?: number
  // Only populated by getEntity() below — wallet-overview and trace-node
  // entity summaries omit it (those already know the one address in
  // question from context, and never need the entity's full address list).
  addresses?: EntityAddressInfo[]
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

export interface PathQuery {
  asset?: string
  // RFC3339, both optional. Named from_time/to_time (not from/to) because
  // those are already the two address params on this endpoint.
  from_time?: string
  to_time?: string
  max_hops?: number
  limit?: number
}

// A "path" here is observed transaction connectivity between two
// addresses, not proof that specific funds traveled every hop — value
// merges with an address's existing balance on arrival in an account-based
// model, so this is never called a "fund path" anywhere in this codebase.
export interface Path {
  hop_count: number
  time_span_seconds: number
  // A ranking signal (hops close together in time), not a probability —
  // see PathMeta.complete for the actual honesty story around this result.
  tight_timing: boolean
  edges: TraceEdge[]
}

export interface PathMeta {
  // Distinguishes "searched exhaustively, no path exists under these
  // filters" (true) from "search budget ran out first" (false) — a hub
  // address whose fan-out exceeds max_fanout_per_node can produce
  // complete:false with zero paths, which reads very differently than a
  // genuine dead end.
  complete: boolean
  nodes_expanded: number
  max_nodes_expanded: number
  max_hops: number
  max_fanout_per_node: number
}

export interface PathResult {
  from: string
  to: string
  chain_id: number
  paths: Path[]
  meta: PathMeta
}

// Every call below takes the caller's currently-selected chain_id, sourced
// from whichever page owns that choice now (chain is per-page state, not a
// global header switcher — see WalletPage/TracePage's local chainId) so
// wallet/transaction/trace data always scopes to the network the user
// picked, instead of implicitly assuming Ethereum. The backend defaults
// chain_id to 1 when omitted, but call
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

  findPath: (from: string, to: string, query: PathQuery, chainId: number) =>
    request<PathResult>('/trace/paths', { ...query, from, to, chain_id: chainId }),

  getStats: (chainId: number) => request<StatsOverview>('/stats', { chain_id: chainId }),

  listLatestTransactions: (query: FeedQuery) =>
    request<FeedPage>('/transactions/latest', {
      chain_id: query.chainId,
      kind: query.kind,
      sort_by: query.sortBy,
      sort_dir: query.sortDir,
      page: query.page,
      limit: query.limit,
    }),

  getTopCoins: () => request<CoinPrice[]>('/prices/top'),

  // Chain-agnostic by design — no chain_id param. See discuss.txt: search
  // resolves *which address*, chain selection happens on the address page.
  search: (query: string) => request<SearchResultItem[]>('/search', { q: query }),

  // Chain-agnostic like search — an entity's addresses span whichever
  // chains it's tagged on, not a single caller-selected one.
  getEntity: (id: number) => request<EntitySummary>(`/entities/${id}`),
}
