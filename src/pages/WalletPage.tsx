import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api, type TokenHolding } from '@/lib/api'
import { shortenAddress } from '@/lib/address'
import { DEFAULT_CHAIN_ID, getNetwork, NETWORKS, type ChainId } from '@/lib/network'
import { formatAssetQuantity, formatDisplayAmount, formatTokenAmount, sumCrossChainAmount } from '@/lib/token'
import { formatUsd } from '@/lib/currency'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TokenIcon } from '@/components/TokenIcon'

const TOP_ASSET_COUNT = 5

interface AssetGroup {
  symbol: string
  name: string
  totalUsd: number
  totalQuantity: number // summed across chains, normalized for decimals
  chains: TokenHolding[] // sorted by usd_value desc
}

interface ChainGroup {
  chainId: number
  totalUsd: number
  holdings: TokenHolding[] // sorted by usd_value desc
}

function usdOf(h: TokenHolding): number {
  return h.usd_value ?? 0
}

// Groups by symbol (an asset held across multiple chains — e.g. native ETH
// plus Binance-Peg ETH — is one economic position, not several unrelated
// rows) and ranks by combined USD value across chains.
function groupByAsset(holdings: TokenHolding[]): AssetGroup[] {
  const bySymbol = new Map<string, TokenHolding[]>()
  for (const h of holdings) {
    const key = h.token_symbol.toUpperCase()
    const list = bySymbol.get(key)
    if (list) list.push(h)
    else bySymbol.set(key, [h])
  }
  const groups: AssetGroup[] = []
  for (const [symbol, chains] of bySymbol) {
    chains.sort((a, b) => usdOf(b) - usdOf(a))
    groups.push({
      symbol,
      name: chains[0].token_name,
      totalUsd: chains.reduce((sum, h) => sum + usdOf(h), 0),
      totalQuantity: sumCrossChainAmount(chains),
      chains,
    })
  }
  groups.sort((a, b) => b.totalUsd - a.totalUsd)
  return groups
}

function groupByChain(holdings: TokenHolding[]): ChainGroup[] {
  const byChain = new Map<number, TokenHolding[]>()
  for (const h of holdings) {
    const list = byChain.get(h.chain_id)
    if (list) list.push(h)
    else byChain.set(h.chain_id, [h])
  }
  const groups: ChainGroup[] = []
  for (const [chainId, chainHoldings] of byChain) {
    chainHoldings.sort((a, b) => usdOf(b) - usdOf(a))
    groups.push({
      chainId,
      totalUsd: chainHoldings.reduce((sum, h) => sum + usdOf(h), 0),
      holdings: chainHoldings,
    })
  }
  groups.sort((a, b) => b.totalUsd - a.totalUsd)
  return groups
}

const PAGE_LIMIT = 20

export function WalletPage() {
  // address is always present in practice (the route is /address/:address,
  // there's no bare /address route), but useParams types it as possibly
  // undefined — every hook below runs unconditionally regardless
  // (react-hooks/rules-of-hooks) rather than gating on an early return,
  // guarding the actual queries with `enabled: !!address` instead.
  const { address } = useParams<{ address: string }>()
  // No more global header switcher — chain is local to this page. Starts on
  // DEFAULT_CHAIN_ID and gets overridden once (see effect below) to whichever
  // chain holdings shows the most value on, unless the user has already
  // picked a chain themselves.
  const [chainId, setChainId] = useState<ChainId>(DEFAULT_CHAIN_ID)
  const [userPickedChain, setUserPickedChain] = useState(false)
  const network = getNetwork(chainId)
  const [tab, setTab] = useState<'transactions' | 'transfers' | 'holdings'>('transactions')
  const [page, setPage] = useState(1)

  const overview = useQuery({
    queryKey: ['wallet', chainId, address],
    queryFn: () => api.getWalletOverview(address!, chainId),
    enabled: !!address,
  })

  const transactions = useQuery({
    queryKey: ['wallet', chainId, address, 'transactions', page],
    queryFn: () => api.listWalletTransactions(address!, page, PAGE_LIMIT, chainId),
    enabled: !!address && tab === 'transactions',
  })

  const transfers = useQuery({
    queryKey: ['wallet', chainId, address, 'transfers', page],
    queryFn: () => api.listWalletTransfers(address!, page, PAGE_LIMIT, chainId),
    enabled: !!address && tab === 'transfers',
  })

  // Deliberately not keyed on chainId — holdings cover every chain at
  // once, live via RPC, so it's unaffected by which chain the header's
  // network switcher is on. No auto-refresh either: each load is a fresh
  // RPC balance check, and this is a "check now" view a user opens
  // on-demand, not a live ticker worth polling and burning RPC quota on.
  //
  // Fetched as soon as the address is known (not gated on tab === 'holdings')
  // because the overview card's multi-chain total value stat needs it on
  // first paint, before the user ever clicks into the Holdings tab.
  const holdings = useQuery({
    queryKey: ['wallet', address, 'holdings'],
    queryFn: () => api.getWalletHoldings(address!),
    enabled: !!address,
  })

  const topAssets = useMemo(() => (holdings.data ? groupByAsset(holdings.data).slice(0, TOP_ASSET_COUNT) : []), [holdings.data])
  const chainGroups = useMemo(() => (holdings.data ? groupByChain(holdings.data) : []), [holdings.data])
  const totalValueUsd = useMemo(
    () => (holdings.data ? holdings.data.reduce((sum, h) => sum + (h.usd_value ?? 0), 0) : undefined),
    [holdings.data]
  )

  // groupByChain sorts by totalUsd desc, so [0] is the "primary chain" —
  // mirrors discuss.txt's scoring idea (most value/activity wins the
  // default tab) without needing a separate backend field for it yet.
  // Only runs until the user picks a chain themselves; after that their
  // choice sticks even if holdings later reload.
  useEffect(() => {
    if (userPickedChain || chainGroups.length === 0) return
    setChainId(chainGroups[0].chainId as ChainId)
  }, [chainGroups, userPickedChain])

  if (!address) return null

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            {overview.data?.entity ? (
              <>
                <div className="flex items-center gap-2">
                  <Link to={`/entity/${overview.data.entity.id}`} className="hover:text-primary">
                    <CardTitle className="text-xl">{overview.data.entity.name}</CardTitle>
                  </Link>
                  <Badge variant="secondary">{overview.data.entity.type}</Badge>
                </div>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{address}</p>
              </>
            ) : (
              <CardTitle className="font-mono text-base">{address}</CardTitle>
            )}
            {overview.data?.contract_name && (
              <p className="mt-0.5 text-xs text-muted-foreground">{overview.data.contract_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Chain tabs — indexed data (overview/transactions/transfers) is
                per-chain, unlike holdings above which is already multichain.
                Switching here re-scopes those three queries; it never gates
                whether the address itself was found. */}
            <Tabs
              value={String(chainId)}
              onValueChange={(value) => {
                setUserPickedChain(true)
                setChainId(Number(value) as ChainId)
                setPage(1)
              }}
            >
              <TabsList>
                {NETWORKS.map((n) => (
                  <TabsTrigger key={n.id} value={String(n.id)}>
                    {n.shortName}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button size="sm" render={<Link to={`/trace/${address}`}>View Trace</Link>} />
          </div>
        </CardHeader>
        <CardContent>
          {overview.isLoading && <Skeleton className="h-16 w-full" />}
          {overview.data && (
            <div className="flex gap-8 text-sm">
              <Stat label="Type" value={overview.data.type} />
              <Stat label="Transactions" value={overview.data.transaction_count.toLocaleString()} />
              <Stat label="First seen block" value={overview.data.first_seen_block.toLocaleString()} />
              <Stat label="Last seen block" value={overview.data.last_seen_block.toLocaleString()} />
              <Stat
                label="Multi-chain total value"
                value={totalValueUsd !== undefined ? formatUsd(totalValueUsd) : holdings.isError ? '—' : 'Loading…'}
              />
              <Stat
                label="Latest transaction"
                value={
                  overview.data.latest_transaction_at
                    ? new Date(overview.data.latest_transaction_at).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'No transactions'
                }
              />
            </div>
          )}
          {overview.isError && <p className="text-sm text-destructive">Wallet not found.</p>}
        </CardContent>
      </Card>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value as 'transactions' | 'transfers' | 'holdings')
          setPage(1)
        }}
      >
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="transfers">Token Transfers</TabsTrigger>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hash</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.data?.items.map((tx) => (
                    <TableRow key={tx.hash}>
                      <TableCell className="font-mono text-xs">{shortenAddress(tx.hash)}</TableCell>
                      <TableCell className="font-mono text-xs">{shortenAddress(tx.from_address)}</TableCell>
                      <TableCell className="font-mono text-xs">{shortenAddress(tx.to_address)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatTokenAmount(tx.value, 18)} {network.nativeSymbol}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 'success' ? 'default' : 'destructive'}>{tx.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{tx.timestamp}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tx Hash</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.data?.items.map((t, i) => (
                    <TableRow key={`${t.transaction_hash}-${i}`}>
                      <TableCell className="font-mono text-xs">{shortenAddress(t.transaction_hash)}</TableCell>
                      <TableCell className="font-mono text-xs" title={t.token_address}>
                        {t.token_symbol || shortenAddress(t.token_address)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{shortenAddress(t.from_address)}</TableCell>
                      <TableCell className="font-mono text-xs">{shortenAddress(t.to_address)}</TableCell>
                      <TableCell className="font-mono text-xs">{formatDisplayAmount(t)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holdings">
        <div className="flex flex-col gap-6">
          {holdings.isLoading && <Skeleton className="h-32 w-full" />}
          {holdings.isError && <p className="text-sm text-destructive">Failed to load holdings.</p>}

          {holdings.data && holdings.data.length === 0 && (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                No holdings found on any configured chain.
              </CardContent>
            </Card>
          )}

          {holdings.data && holdings.data.length > 0 && (
            <>
              {topAssets.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Top Assets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                      {topAssets.map((asset) => (
                        <div
                          key={asset.symbol}
                          className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-center"
                        >
                          <TokenIcon symbol={asset.symbol} size={32} />
                          <div className="flex flex-col leading-tight">
                            <span className="text-sm font-medium text-foreground">{asset.name}</span>
                            <span className="text-[10px] uppercase text-muted-foreground">{asset.symbol}</span>
                          </div>
                          <div className="flex flex-col items-center leading-tight">
                            <span className="font-mono text-sm font-semibold text-foreground">{formatUsd(asset.totalUsd)}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {formatAssetQuantity(asset.totalQuantity)} {asset.symbol}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {asset.chains.map((h) => (
                              <span
                                key={h.chain_id}
                                className="flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              >
                                <TokenIcon symbol={getNetwork(h.chain_id as ChainId).nativeSymbol} size={10} />
                                {getNetwork(h.chain_id as ChainId).shortName}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {chainGroups.map((group) => {
                  const net = getNetwork(group.chainId as ChainId)
                  return (
                    <Card key={group.chainId}>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <TokenIcon symbol={net.nativeSymbol} size={18} />
                          {net.shortName}
                        </CardTitle>
                        <span className="font-mono text-sm font-medium text-foreground">{formatUsd(group.totalUsd)}</span>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Token</TableHead>
                              <TableHead>Balance</TableHead>
                              <TableHead>USD</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.holdings.map((h, i) => (
                              <TableRow key={`${h.token_address ?? 'native'}-${i}`}>
                                <TableCell>
                                  <span className="flex items-center gap-1.5 text-xs">
                                    <TokenIcon symbol={h.token_symbol} size={18} />
                                    <span className="flex flex-col leading-tight">
                                      <span className="font-medium text-foreground">{h.token_name}</span>
                                      <span className="text-[10px] text-muted-foreground uppercase">{h.token_symbol}</span>
                                    </span>
                                  </span>
                                </TableCell>
                                <TableCell className="font-mono text-xs">{formatTokenAmount(h.balance, h.decimals)}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {h.usd_value !== undefined ? formatUsd(h.usd_value) : '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
