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

export type TraceDirection = 'out' | 'in' | 'all'

export interface TraceQuery {
  direction?: TraceDirection
  depth?: number
  min_value?: string
  max_nodes?: number
  max_edges?: number
}

export interface TraceNode {
  address: string
}

export interface TraceEdge {
  from: string
  to: string
  token_address: string
  amount: string
  transaction_hash: string
}

export interface TraceResult {
  root_address: string
  nodes: TraceNode[]
  edges: TraceEdge[]
  truncated: boolean
}

export const api = {
  getWalletOverview: (address: string) => request<WalletOverview>(`/wallets/${address}`),

  listWalletTransactions: (address: string, page: number, limit: number) =>
    requestPaginated<TransactionSummary>(`/wallets/${address}/transactions`, { page, limit }),

  listWalletTransfers: (address: string, page: number, limit: number) =>
    requestPaginated<TokenTransferSummary>(`/wallets/${address}/transfers`, { page, limit }),

  getTransaction: (hash: string) => request<TransactionDetail>(`/transactions/${hash}`),

  trace: (address: string, query: TraceQuery) =>
    request<TraceResult>(`/trace/${address}`, { ...query }),
}
