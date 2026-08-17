import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { api } from '@/lib/api'
import { getNetwork, type ChainId } from '@/lib/network'
import { useCopyToClipboard } from '@/lib/useCopyToClipboard'
import { TokenIcon } from '@/components/TokenIcon'
import { AttributionBadge } from '@/components/AttributionBadge'
import { Copy, Check } from 'lucide-react'

// The resource discuss.txt calls out as still missing: an entity is a
// chain-agnostic identity (e.g. "Binance") that can own several addresses
// across several chains — this is the one place that groups them all
// together, instead of an entity only ever showing up as a badge attached
// to a single address on WalletPage or as one row in a search suggestion.
export function EntityPage() {
  const { id } = useParams<{ id: string }>()
  const entityId = Number(id)

  const entity = useQuery({
    queryKey: ['entity', entityId],
    queryFn: () => api.getEntity(entityId),
    enabled: Number.isFinite(entityId),
  })

  if (!id) return null

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          {entity.isLoading && <Skeleton className="h-8 w-48" />}
          {entity.data && (
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{entity.data.name}</CardTitle>
              <Badge variant="secondary">{entity.data.type}</Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {entity.isLoading && <Skeleton className="h-4 w-full max-w-md" />}
          {entity.isError && <p className="text-sm text-destructive">Entity not found.</p>}
          {entity.data && (
            <div className="flex flex-col gap-4">
              {entity.data.description && <p className="text-sm text-muted-foreground">{entity.data.description}</p>}
              <div className="flex gap-8 text-sm">
                <Stat label="Confidence" value={`${Math.round(entity.data.confidence * 100)}%`} />
                <Stat label="Addresses" value={String(entity.data.addresses?.length ?? 0)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {entity.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Addresses</CardTitle>
          </CardHeader>
          <CardContent>
            {(entity.data.addresses?.length ?? 0) === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No addresses tagged to this entity.</p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {entity.data.addresses!.map((a) => (
                  <AddressRow
                    key={`${a.chain_id}-${a.address}`}
                    address={a.address}
                    chainId={a.chain_id}
                    source={a.source}
                    confidence={a.confidence}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AddressRow({
  address,
  chainId,
  source,
  confidence,
}: {
  address: string
  chainId: number
  source: string
  confidence: number
}) {
  const { copied, copy } = useCopyToClipboard()
  const network = getNetwork(chainId as ChainId)

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <TokenIcon symbol={network.nativeSymbol} size={18} />
        <Link to={`/address/${address}`} className="min-w-0 truncate font-mono text-sm hover:text-primary">
          {address}
        </Link>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <AttributionBadge source={source} confidence={confidence} />
        <span className="text-xs text-muted-foreground">{network.shortName}</span>
        <Tooltip>
          <TooltipTrigger render={<button type="button" className="shrink-0" onClick={() => copy(address)} />}>
            {copied ? (
              <Check className="size-3.5 text-emerald-500" />
            ) : (
              <Copy className="size-3.5 text-muted-foreground hover:text-foreground" />
            )}
          </TooltipTrigger>
          <TooltipContent>Copy address</TooltipContent>
        </Tooltip>
      </div>
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
