import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { attributionLevel, formatSource } from '@/lib/entity'
import { cn } from '@/lib/utils'

const LEVEL_STYLE: Record<ReturnType<typeof attributionLevel>, { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' },
  likely: { label: 'Likely', className: 'border-amber-500/30 bg-amber-500/10 text-amber-500' },
  unknown: { label: 'Unknown', className: 'border-border bg-muted text-muted-foreground' },
}

// One badge, used everywhere an entity label is attached to a specific
// address (WalletPage, TracePage node tooltip, EntityPage's address list)
// so "Binance" never reads as flat fact when the underlying attribution is
// a heuristic guess — hover for the actual source and confidence number.
export function AttributionBadge({ source, confidence }: { source?: string; confidence?: number }) {
  const level = attributionLevel(confidence)
  const style = LEVEL_STYLE[level]

  return (
    <Tooltip>
      <TooltipTrigger render={<Badge variant="outline" className={cn('gap-1', style.className)} />}>
        {style.label}
      </TooltipTrigger>
      <TooltipContent>
        {formatSource(source)}
        {confidence !== undefined && ` · ${Math.round(confidence * 100)}% confidence`}
      </TooltipContent>
    </Tooltip>
  )
}
