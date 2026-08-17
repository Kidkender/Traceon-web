import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { shortenAddress } from '@/lib/address'
import { useNetwork } from '@/lib/NetworkContext'
import { getNetwork, type ChainId } from '@/lib/network'
import { formatDisplayAmount, formatTokenAmount } from '@/lib/token'
import { formatUsd } from '@/lib/currency'
import { TokenIcon } from '@/components/TokenIcon'

const PAGE_LIMIT = 20

export function WalletPage() {
  // address is always present in practice (the route is /wallets/:address,
  // there's no bare /wallets route), but useParams types it as possibly
  // undefined — every hook below runs unconditionally regardless
  // (react-hooks/rules-of-hooks) rather than gating on an early return,
  // guarding the actual queries with `enabled: !!address` instead.
  const { address } = useParams<{ address: string }>()
  const { chainId } = useNetwork()
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
  const holdings = useQuery({
    queryKey: ['wallet', address, 'holdings'],
    queryFn: () => api.getWalletHoldings(address!),
    enabled: !!address && tab === 'holdings',
  })

  if (!address) return null

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-mono text-base">{address}</CardTitle>
            {overview.data?.contract_name && (
              <p className="mt-0.5 text-xs text-muted-foreground">{overview.data.contract_name}</p>
            )}
          </div>
          <Button size="sm" render={<Link to={`/trace/${address}`}>View Trace</Link>} />
        </CardHeader>
        <CardContent>
          {overview.isLoading && <Skeleton className="h-16 w-full" />}
          {overview.data && (
            <div className="flex gap-8 text-sm">
              <Stat label="Type" value={overview.data.type} />
              <Stat label="Transactions" value={overview.data.transaction_count.toLocaleString()} />
              <Stat label="First seen block" value={overview.data.first_seen_block.toLocaleString()} />
              <Stat label="Last seen block" value={overview.data.last_seen_block.toLocaleString()} />
            </div>
          )}
          {overview.isError && <p className="text-sm text-destructive">Wallet not found.</p>}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant={tab === 'transactions' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setTab('transactions')
            setPage(1)
          }}
        >
          Transactions
        </Button>
        <Button
          variant={tab === 'transfers' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setTab('transfers')
            setPage(1)
          }}
        >
          Token Transfers
        </Button>
        <Button variant={tab === 'holdings' ? 'default' : 'outline'} size="sm" onClick={() => setTab('holdings')}>
          Holdings
        </Button>
      </div>

      {tab === 'transactions' && (
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
      )}

      {tab === 'transfers' && (
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
      )}

      {tab === 'holdings' && (
        <Card>
          <CardContent>
            {holdings.isLoading && <Skeleton className="h-32 w-full" />}
            {holdings.isError && <p className="text-sm text-destructive">Failed to load holdings.</p>}
            {holdings.data && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Network</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>USD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings.data.map((h, i) => {
                    const holdingNetwork = getNetwork(h.chain_id as ChainId)
                    return (
                      <TableRow key={`${h.chain_id}-${h.token_address ?? 'native'}-${i}`}>
                        <TableCell>
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <TokenIcon symbol={holdingNetwork.nativeSymbol} size={16} />
                            {holdingNetwork.shortName}
                          </span>
                        </TableCell>
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
                    )
                  })}
                  {holdings.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                        No holdings found on any configured chain.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
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
