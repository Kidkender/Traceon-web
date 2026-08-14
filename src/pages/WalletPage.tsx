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

const PAGE_LIMIT = 20

export function WalletPage() {
  const { address } = useParams<{ address: string }>()
  if (!address) return null

  const { chainId } = useNetwork()
  const [tab, setTab] = useState<'transactions' | 'transfers'>('transactions')
  const [page, setPage] = useState(1)

  const overview = useQuery({
    queryKey: ['wallet', chainId, address],
    queryFn: () => api.getWalletOverview(address, chainId),
  })

  const transactions = useQuery({
    queryKey: ['wallet', chainId, address, 'transactions', page],
    queryFn: () => api.listWalletTransactions(address, page, PAGE_LIMIT, chainId),
    enabled: tab === 'transactions',
  })

  const transfers = useQuery({
    queryKey: ['wallet', chainId, address, 'transfers', page],
    queryFn: () => api.listWalletTransfers(address, page, PAGE_LIMIT, chainId),
    enabled: tab === 'transfers',
  })

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-mono text-base">{address}</CardTitle>
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
                    <TableCell>{tx.value}</TableCell>
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
                    <TableCell className="font-mono text-xs">{shortenAddress(t.token_address)}</TableCell>
                    <TableCell className="font-mono text-xs">{shortenAddress(t.from_address)}</TableCell>
                    <TableCell className="font-mono text-xs">{shortenAddress(t.to_address)}</TableCell>
                    <TableCell>{t.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
