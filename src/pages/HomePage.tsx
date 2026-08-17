import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Activity, ArrowRight, Blocks, Check, ChevronLeft, ChevronRight, Copy, Wallet } from 'lucide-react'
import { useNetwork } from '@/lib/NetworkContext'
import { getNetwork, NETWORKS, type ChainId } from '@/lib/network'
import { api, type FeedKind, type FeedSort } from '@/lib/api'
import { shortenAddress } from '@/lib/address'
import { formatTokenAmount } from '@/lib/token'
import { cn } from '@/lib/utils'
import { formatUsd } from '@/lib/currency'
import { useCopyToClipboard } from '@/lib/useCopyToClipboard'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { TokenIcon } from '@/components/TokenIcon'

const FEED_LIMIT = 25

// "all" is the UI-only sentinel for "every supported chain" — the API
// layer (FeedQuery.chainId) expects `undefined` for that, not a chain id.
const CHAIN_FILTER_ALL = 'all'
type ChainFilter = typeof CHAIN_FILTER_ALL | ChainId

const KIND_FILTER_ALL = 'all'
type KindFilter = typeof KIND_FILTER_ALL | NonNullable<FeedKind>

const exampleWallets = [
  { label: 'Binance hot wallet', address: '0x28c6c06298d514db089934071355e5743bf21d60' },
  { label: 'Coinbase hot wallet', address: '0x71660c4005ba85c37ccec55d0c4493e66fe775d3' },
  { label: 'Kraken hot wallet', address: '0x2910543af39aba0cd09dbb2d50200b3e0256726' },
]

export function HomePage() {
  const navigate = useNavigate()
  const { chainId } = useNetwork()
  const network = getNetwork(chainId)

  const stats = useQuery({
    queryKey: ['stats', chainId],
    queryFn: () => api.getStats(chainId),
    // Backend caches this for 30s already; polling a little slower than
    // that keeps the homepage feeling live without duplicating requests
    // the server-side cache would just absorb anyway.
    refetchInterval: 45_000,
  })

  // Deliberately independent of the header's network switcher — this
  // section has its own chain filter (defaulting to "all chains") so it
  // can show cross-chain activity instead of being pinned to whatever
  // chain the wallet search box happens to be scoped to.
  const [feedChain, setFeedChain] = useState<ChainFilter>(CHAIN_FILTER_ALL)
  const [feedKind, setFeedKind] = useState<KindFilter>(KIND_FILTER_ALL)
  const [feedSort, setFeedSort] = useState<FeedSort>('newest')
  const [feedPage, setFeedPage] = useState(1)

  const feed = useQuery({
    queryKey: ['feed', feedChain, feedKind, feedSort, feedPage],
    queryFn: () =>
      api.listLatestTransactions({
        chainId: feedChain === CHAIN_FILTER_ALL ? undefined : feedChain,
        kind: feedKind === KIND_FILTER_ALL ? undefined : feedKind,
        sort: feedSort,
        page: feedPage,
        limit: FEED_LIMIT,
      }),
    // Auto-refreshing while paged in risks shifting rows out from under an
    // offset-paginated page (new activity at the front pushes everything
    // back), so only page one — where that shift is invisible anyway —
    // polls live.
    refetchInterval: feedPage === 1 ? 20_000 : false,
  })

  function updateFeedFilter(update: () => void) {
    update()
    setFeedPage(1)
  }

  const topCoins = useQuery({
    queryKey: ['top-coins'],
    queryFn: () => api.getTopCoins(),
    refetchInterval: 60_000,
  })

  const features = [
    {
      icon: Blocks,
      label: 'Transactions indexed',
      value: stats.data ? stats.data.total_transactions.toLocaleString() : undefined,
      description: `Every ${network.shortName} transaction indexed and searchable, updated as new blocks land.`,
    },
    {
      icon: Wallet,
      label: 'Wallets tracked',
      value: stats.data ? stats.data.total_addresses.toLocaleString() : undefined,
      description: 'Distinct addresses seen on-chain, ready to trace from the moment you search them.',
    },
    {
      icon: Activity,
      label: 'Latest block',
      value: stats.data ? stats.data.latest_block.toLocaleString() : undefined,
      description: 'The indexer follows the chain tip directly — this number moves as blocks confirm.',
      live: true,
    },
  ]

  return (
    <div className="flex flex-col gap-20 py-16 sm:py-24">
      <section className="relative flex flex-col items-center gap-8 overflow-hidden text-center">
        <NodeField />

        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs tracking-wide text-primary">
          {network.name.toUpperCase()} · LIVE
        </span>

        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Trace the flow of funds across{' '}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            any {network.shortName} wallet
          </span>
        </h1>

        <p className="max-w-lg text-muted-foreground">
          Search a wallet above to see its balance, transaction history, and an interactive graph of where its funds
          came from — and where they went.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          <span className="text-muted-foreground">Try an example:</span>
          {exampleWallets.map((w) => (
            <button
              key={w.address}
              type="button"
              onClick={() => navigate(`/trace/${w.address}`)}
              className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 font-mono text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            >
              {w.label}
              <ArrowRight className="size-3 -translate-x-0.5 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.label}
            className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card/40 p-5 transition-colors hover:border-primary/30"
          >
            <div className="absolute -top-8 -right-8 size-24 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-80" />
            <f.icon className="size-5 text-primary" strokeWidth={1.75} />
            {f.value ? (
              <span className="flex items-center gap-2 font-mono text-lg font-medium text-foreground">
                {f.value}
                {f.live && <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden="true" />}
              </span>
            ) : (
              <Skeleton className="h-7 w-24" />
            )}
            <span className="text-sm font-medium text-muted-foreground">{f.label}</span>
            <p className="text-xs text-muted-foreground/80">{f.description}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Top coins</h2>
          <span className="text-xs text-muted-foreground">Live market prices</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {topCoins.isLoading &&
            Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-[86px] rounded-xl" />)}
          {topCoins.data?.map((coin) => {
            const up = coin.price_change_percentage_24h >= 0
            return (
              <div key={coin.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card/40 p-3">
                <div className="flex items-center gap-2">
                  <img src={coin.image} alt={coin.symbol} className="size-5 rounded-full" />
                  <span className="text-xs font-medium text-muted-foreground uppercase">{coin.symbol}</span>
                </div>
                <span className="font-mono text-sm font-medium text-foreground">{formatUsd(coin.current_price)}</span>
                <span className={cn('text-xs font-medium', up ? 'text-emerald-500' : 'text-red-500')}>
                  {up ? '+' : ''}
                  {coin.price_change_percentage_24h.toFixed(2)}%
                </span>
              </div>
            )
          })}
          {!topCoins.isLoading && topCoins.data?.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">Price feed is temporarily unavailable.</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <span className="text-xs text-muted-foreground">
              {feedChain === CHAIN_FILTER_ALL ? 'All chains' : getNetwork(feedChain).name}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(feedChain)}
              onValueChange={(v) =>
                updateFeedFilter(() => setFeedChain(v === CHAIN_FILTER_ALL ? CHAIN_FILTER_ALL : (Number(v) as ChainId)))
              }
            >
              <SelectTrigger className="h-8 w-auto gap-1.5 rounded-full border-border px-2.5 py-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CHAIN_FILTER_ALL}>All chains</SelectItem>
                {NETWORKS.map((n) => (
                  <SelectItem key={n.id} value={String(n.id)}>
                    {n.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={feedKind}
              onValueChange={(v) => updateFeedFilter(() => setFeedKind(v as KindFilter))}
            >
              <SelectTrigger className="h-8 w-auto gap-1.5 rounded-full border-border px-2.5 py-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={KIND_FILTER_ALL}>All activity</SelectItem>
                <SelectItem value="native">Native transfers</SelectItem>
                <SelectItem value="token">Token transfers</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={feedSort}
              onValueChange={(v) => updateFeedFilter(() => setFeedSort(v as FeedSort))}
            >
              <SelectTrigger className="h-8 w-auto gap-1.5 rounded-full border-border px-2.5 py-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Network</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>USD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feed.isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {feed.data?.items.map((tx, i) => {
                  const txNetwork = getNetwork(tx.chain_id as ChainId)
                  return (
                    <TableRow key={`${tx.hash}-${tx.token_address ?? 'native'}-${i}`}>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <TokenIcon symbol={txNetwork.nativeSymbol} size={16} />
                          {txNetwork.shortName}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <AddressCell address={tx.from_address} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <AddressCell address={tx.to_address} />
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-xs">
                          <TokenIcon symbol={tx.token_symbol} size={18} />
                          <span className="flex flex-col leading-tight">
                            <span className="font-medium text-foreground">{tx.token_name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{tx.token_symbol}</span>
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{formatTokenAmount(tx.amount, tx.decimals)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {tx.usd_value !== undefined ? formatUsd(tx.usd_value) : '—'}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!feed.isLoading && feed.data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      No recent activity found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Page {feedPage}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={feedPage === 1}
              onClick={() => setFeedPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!feed.data?.has_next}
              onClick={() => setFeedPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

// Shortened address linking to the wallet page, with a copy button that
// only appears on hover — keeps the table dense while still making the
// full address one click away to copy, without a permanently-visible icon
// competing with the rest of the row.
function AddressCell({ address }: { address: string }) {
  const { copied, copy } = useCopyToClipboard()

  return (
    <span className="group/addr inline-flex items-center gap-1">
      <Link to={`/address/${address}`} className="transition-colors hover:text-primary">
        {shortenAddress(address)}
      </Link>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          copy(address)
        }}
        className="opacity-0 transition-opacity group-hover/addr:opacity-100 focus-visible:opacity-100"
        title="Copy address"
        aria-label="Copy address"
      >
        {copied ? (
          <Check className="size-3 text-emerald-500" />
        ) : (
          <Copy className="size-3 text-muted-foreground hover:text-foreground" />
        )}
      </button>
    </span>
  )
}

// Decorative wallet-graph constellation behind the hero — echoes the Logo's
// node-and-edge motif at a larger scale instead of a stock gradient blob,
// so the page reads as "this is a fund-flow graph tool" at a glance.
function NodeField() {
  const nodes = [
    { x: 60, y: 40, r: 3, c: 'primary' },
    { x: 220, y: 90, r: 2, c: 'accent' },
    { x: 380, y: 30, r: 2.5, c: 'primary' },
    { x: 520, y: 100, r: 2, c: 'accent' },
    { x: 680, y: 50, r: 3, c: 'primary' },
    { x: 140, y: 150, r: 2, c: 'accent' },
    { x: 460, y: 160, r: 2.5, c: 'primary' },
    { x: 620, y: 140, r: 2, c: 'accent' },
  ] as const
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [0, 5],
    [1, 6],
    [3, 6],
    [4, 7],
    [5, 2],
  ] as const

  return (
    <svg
      viewBox="0 0 740 200"
      className="pointer-events-none absolute inset-x-0 -top-6 h-40 w-full opacity-40 sm:h-52"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="currentColor"
          strokeWidth="1"
          className="text-border"
        />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={n.r} className={n.c === 'primary' ? 'fill-primary' : 'fill-accent'} />
      ))}
    </svg>
  )
}
