import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api, type RiskLevel, type RiskSignal } from '@/lib/api'
import { cn } from '@/lib/utils'

const LEVEL_STYLE: Record<RiskLevel, { label: string; className: string }> = {
  high: { label: 'High Risk', className: 'border-red-500/30 bg-red-500/10 text-red-500' },
  medium: { label: 'Medium Risk', className: 'border-amber-500/30 bg-amber-500/10 text-amber-500' },
  low: { label: 'Low Risk', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' },
}

const SEVERITY_STYLE: Record<RiskSignal['severity'], string> = {
  high: 'border-red-500/30 bg-red-500/10 text-red-500',
  medium: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
  low: 'border-border bg-muted text-muted-foreground',
}

const SIGNAL_LABEL: Record<string, string> = {
  fund_forwarding: 'Fund forwarding',
  wallet_cluster: 'Wallet cluster',
  entity_exposure: 'Entity exposure',
  circular_flow: 'Circular flow',
  peel_chain: 'Peel chain',
  structuring: 'Structuring',
}

// Each RiskSignal.type carries its own evidence shape (see traceon-api's
// dto.RiskSignal doc comments) — this turns that free-form evidence into a
// short human sentence per type, falling back to the raw type string for
// anything this build doesn't recognize yet, so an unfamiliar signal never
// disappears silently.
function describeSignal(signal: RiskSignal): string {
  const e = signal.evidence ?? {}
  switch (signal.type) {
    case 'fund_forwarding': {
      const ratio = typeof e.ratio === 'number' ? Math.round(e.ratio * 100) : undefined
      return ratio !== undefined ? `Forwarded ~${ratio}% of funds received` : 'Forwarded most of the funds received'
    }
    case 'wallet_cluster':
      return typeof e.cluster_size === 'number'
        ? `Funded alongside ${e.cluster_size - 1} other wallet(s) in a short window`
        : 'Funded alongside other wallets in a short window'
    case 'entity_exposure': {
      const name = typeof e.entity_name === 'string' ? e.entity_name : 'a flagged entity'
      const hops = typeof e.hop_count === 'number' ? e.hop_count : undefined
      if (e.direct === true) return `Directly connected to ${name}`
      return hops !== undefined ? `${hops} hop(s) from ${name}` : `Connected to ${name}`
    }
    case 'circular_flow': {
      const hops = typeof e.cycle_hop_count === 'number' ? e.cycle_hop_count : undefined
      return hops !== undefined
        ? `Funds returned to this address after ${hops} hop(s)`
        : 'Funds observed returning to this address'
    }
    case 'peel_chain': {
      const len = typeof e.chain_length === 'number' ? e.chain_length : undefined
      return len !== undefined ? `Part of a ${len}-hop forwarding chain` : 'Part of a multi-hop forwarding chain'
    }
    case 'structuring': {
      const count = typeof e.recipient_count === 'number' ? e.recipient_count : undefined
      return count !== undefined
        ? `Split into ${count} near-equal transfers of the same token`
        : 'Split funds into several near-equal transfers'
    }
    default:
      return SIGNAL_LABEL[signal.type] ?? signal.type
  }
}

// Surfaces the interpretation layer (traceon-api's risk engine) on top of
// whatever trace evidence exists for `address` — deliberately soft-fails
// (renders nothing on error/loading-forever) since this is supplementary
// context on the wallet page, not something that should block the rest of
// the page if the risk endpoint is slow or unavailable.
export function RiskAssessmentCard({ address, chainId }: { address: string; chainId: number }) {
  const risk = useQuery({
    queryKey: ['risk', chainId, address],
    queryFn: () => api.getRiskAssessment(address, chainId),
    enabled: !!address,
  })

  if (risk.isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (risk.isError || !risk.data) return null

  const { level, score, signals, disclaimer } = risk.data
  const style = LEVEL_STYLE[level]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Risk Assessment</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Score {Math.round(score)}/100</span>
          <Badge variant="outline" className={cn(style.className)}>
            {style.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {signals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No risk signals observed in the traced subgraph.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {signals.map((signal, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className={cn('mt-0.5 shrink-0', SEVERITY_STYLE[signal.severity])}>
                  {SIGNAL_LABEL[signal.type] ?? signal.type}
                </Badge>
                <span className="text-muted-foreground">{describeSignal(signal)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">{disclaimer}</p>
      </CardContent>
    </Card>
  )
}
