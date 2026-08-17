import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d'
import { ArrowRight, Check, Copy, Fuel, SlidersHorizontal, Waypoints } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  api,
  FLAG_POTENTIAL_FUND_FORWARDING,
  FLAG_POTENTIAL_WALLET_CLUSTER,
  type EntitySummary,
  type LabelSummary,
  type TraceDirection,
  type TraceEdge,
} from '@/lib/api'
import { isValidAddress, shortenAddress } from '@/lib/address'
import { attributionLevel, formatSource } from '@/lib/entity'
import { DEFAULT_CHAIN_ID, NETWORKS, isChainId, type ChainId } from '@/lib/network'
import { ASSUMED_DECIMALS_FALLBACK, formatDisplayAmount, formatTokenAmount } from '@/lib/token'
import { exchangeVisual, getExchangeIconImage } from '@/lib/exchange'
import { useCopyToClipboard } from '@/lib/useCopyToClipboard'
import { TokenIcon } from '@/components/TokenIcon'

const ENTITY_TYPE_EXCHANGE = 'EXCHANGE'

interface GraphNode {
  id: string
  isRoot: boolean
  isForwarding: boolean
  isCluster: boolean
  entity?: EntitySummary
  labels?: LabelSummary[]
}

interface GraphLink {
  source: string
  target: string
  edge: TraceEdge
}

interface SimNode {
  x?: number
  y?: number
}

// Minimal pairwise collision force (no d3-force-3d dep pulled in directly —
// react-force-graph-2d only exposes it transitively). Trace graphs are
// depth-bounded to a few hundred nodes at most, so O(n^2) per tick is cheap
// enough without needing a quadtree.
function createCollideForce(minDistance: number) {
  let nodes: SimNode[] = []
  function force(alpha: number) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        const dx = (b.x ?? 0) - (a.x ?? 0)
        const dy = (b.y ?? 0) - (a.y ?? 0)
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
        if (dist >= minDistance) continue
        const push = ((minDistance - dist) / dist) * 0.5 * alpha
        const ox = dx * push
        const oy = dy * push
        a.x = (a.x ?? 0) - ox
        a.y = (a.y ?? 0) - oy
        b.x = (b.x ?? 0) + ox
        b.y = (b.y ?? 0) + oy
      }
    }
  }
  force.initialize = (ns: SimNode[]) => {
    nodes = ns
  }
  return force
}

// Filters live in the URL (see TracePage's use of useSearchParams) instead
// of plain component state, so a trace with a specific direction/depth/
// min-value/chain can be copy-pasted and reopened exactly as configured —
// these parse+validate each query param back into a safe value, falling
// back to the same defaults the filters started with before this existed.
function parseDirection(value: string | null): TraceDirection {
  return value === 'in' || value === 'all' ? value : 'out'
}

function parseDepth(value: string | null): number {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : 2
}

function parseChainId(value: string | null): ChainId {
  const n = Number(value)
  return isChainId(n) ? n : DEFAULT_CHAIN_ID
}

// The URL stores from/to as RFC3339 (what the backend expects verbatim),
// but a datetime-local <input> reads/writes its own timezone-naive
// "YYYY-MM-DDTHH:mm" format — these convert between the two so the input
// always shows the equivalent local time for whatever's in the URL.
function isoToLocalInputValue(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputValueToIso(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

export function TracePage() {
  // address is undefined on the bare /trace route (the header's
  // "Visualization" nav entry point) — CardContent below renders an empty
  // state prompting for one instead of a graph in that case. Every hook
  // below runs unconditionally regardless (react-hooks/rules-of-hooks:
  // hooks can never be behind an early return), guarding on `address`
  // internally (`enabled: !!address`) instead of skipping the call.
  const { address } = useParams<{ address: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Sourced from the URL instead of plain state — see parseDirection/
  // parseDepth/parseChainId above — so a trace with a specific direction/
  // depth/min-value/chain is a link you can copy and share, not just
  // in-memory UI state that resets the moment someone else opens the page.
  const direction = parseDirection(searchParams.get('direction'))
  const depth = parseDepth(searchParams.get('depth'))
  const minValue = searchParams.get('min_value') ?? '0'
  const chainId = parseChainId(searchParams.get('chain_id'))
  // Token contract address — empty means "every asset". RFC3339, matching
  // what the backend expects directly (no conversion needed on read).
  const asset = searchParams.get('asset') ?? ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''

  // Merges one param into the URL (replace, not push — every filter tweak
  // getting its own back-button entry would make navigating "back" out of
  // the trace page require mashing back through every slider tick instead
  // of once). An empty value clears the param entirely rather than storing
  // an empty string, so optional filters (asset/from/to) round-trip back
  // to "unset" instead of an empty-but-present query param.
  function updateFilter(key: string, value: string | null) {
    if (value === null) return
    const next = new URLSearchParams(searchParams)
    if (value === '') next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  const [selectedEdge, setSelectedEdge] = useState<TraceEdge | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [addressQuery, setAddressQuery] = useState(address ?? '')
  const [addressError, setAddressError] = useState<string | null>(null)
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined)

  function handleAddressSearch(e: FormEvent) {
    e.preventDefault()
    const next = addressQuery.trim()
    if (!isValidAddress(next)) {
      setAddressError('Invalid Ethereum address')
      return
    }
    setAddressError(null)
    // Carries the current filters over to the new root — re-rooting a
    // trace usually means "same investigation, different starting point,"
    // not "reset everything."
    navigate(`/trace/${next}?${searchParams.toString()}`)
  }

  const trace = useQuery({
    queryKey: ['trace', chainId, address, direction, depth, minValue, asset, from, to],
    // Non-null assertion is safe here: `enabled` keeps this from firing
    // until address exists.
    queryFn: () =>
      api.trace(
        address!,
        {
          direction,
          depth,
          min_value: minValue,
          asset: asset || undefined,
          from: from || undefined,
          to: to || undefined,
        },
        chainId,
      ),
    enabled: !!address,
  })

  const selectedTx = useQuery({
    queryKey: ['transaction', chainId, selectedEdge?.transaction_hash],
    queryFn: () => api.getTransaction(selectedEdge!.transaction_hash, chainId),
    enabled: selectedEdge !== null,
  })

  const graphData = useMemo(() => {
    if (!trace.data) return { nodes: [] as GraphNode[], links: [] as GraphLink[] }
    return {
      nodes: trace.data.nodes.map((n) => ({
        id: n.address,
        isRoot: n.address === address,
        isForwarding: n.flags?.includes(FLAG_POTENTIAL_FUND_FORWARDING) ?? false,
        isCluster: n.flags?.includes(FLAG_POTENTIAL_WALLET_CLUSTER) ?? false,
        entity: n.entity,
        labels: n.labels,
      })),
      links: trace.data.edges.map((e) => ({ source: e.from, target: e.to, edge: e })),
    }
  }, [trace.data, address])

  function nodeColor(n: GraphNode): string {
    if (n.isRoot) return '#34d399'
    if (n.isForwarding && n.isCluster) return '#ec4899'
    if (n.isCluster) return '#a855f7'
    if (n.isForwarding) return '#f59e0b'
    if (n.entity) return '#38bdf8'
    return '#64748b'
  }

  const NODE_FONT_SIZE = 3
  const NODE_MIN_RADIUS = 6
  const NODE_PAD = 1.5
  const EXCHANGE_RADIUS = 8

  function isExchangeNode(n: GraphNode): boolean {
    return n.entity?.type === ENTITY_TYPE_EXCHANGE
  }

  function nodeText(n: GraphNode): string {
    return `${n.id.slice(0, 5)}…`
  }

  function nodeRadius(n: GraphNode, ctx: CanvasRenderingContext2D): number {
    if (isExchangeNode(n)) return EXCHANGE_RADIUS
    ctx.font = `600 ${NODE_FONT_SIZE}px sans-serif`
    const textWidth = ctx.measureText(nodeText(n)).width
    // Diameter must fit the text's diagonal so the label clears the circle's
    // curved edge instead of overflowing the corners of a tight bounding box.
    const neededDiameter = Math.sqrt(textWidth ** 2 + NODE_FONT_SIZE ** 2) + NODE_PAD * 2
    return Math.max(NODE_MIN_RADIUS, neededDiameter / 2)
  }

  // Exchange wallets (Binance, OKX, Bybit, ...) are recognizable by brand,
  // so the address text inside the bubble is redundant clutter — swap it
  // for the exchange's real logo instead. The full address is still one
  // hover away via nodeLabel.
  function drawBadgeCircle(ctx: CanvasRenderingContext2D, x: number, y: number, isRoot: boolean, fill: string) {
    ctx.beginPath()
    ctx.arc(x, y, EXCHANGE_RADIUS, 0, 2 * Math.PI)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.lineWidth = 0.6
    ctx.strokeStyle = isRoot ? '#34d399' : 'rgba(15,23,42,0.15)'
    ctx.stroke()
  }

  function drawMonogramBadge(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    isRoot: boolean,
    label: string,
    bg: string,
    fg: string,
  ) {
    drawBadgeCircle(ctx, x, y, isRoot, bg)
    const fontSize = label.length > 2 ? 2.6 : 3.2
    ctx.font = `700 ${fontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = fg
    ctx.fillText(label, x, y + 0.2)
  }

  function drawExchangeNode(n: GraphNode, ctx: CanvasRenderingContext2D) {
    const x = (n as unknown as { x: number }).x
    const y = (n as unknown as { y: number }).y
    const visual = exchangeVisual(n.entity!.name)

    if (visual.kind === 'monogram') {
      drawMonogramBadge(ctx, x, y, n.isRoot, visual.label, visual.bg, visual.fg)
      return
    }

    // White backing circle so brand marks that assume a light background
    // (e.g. OKX's black glyph) stay legible on the dark graph canvas.
    drawBadgeCircle(ctx, x, y, n.isRoot, '#ffffff')

    const img = getExchangeIconImage(visual.svg, () => fgRef.current?.d3ReheatSimulation())
    if (!img.complete || img.naturalWidth === 0) {
      // Still decoding — fall back to a monogram for this frame only;
      // onLoad above reheats the sim so the next frames pick up the logo.
      drawMonogramBadge(ctx, x, y, n.isRoot, 'EX', '#334155', '#ffffff')
      return
    }

    const inset = EXCHANGE_RADIUS * 0.7
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, EXCHANGE_RADIUS - 0.4, 0, 2 * Math.PI)
    ctx.clip()
    ctx.drawImage(img, x - inset, y - inset, inset * 2, inset * 2)
    ctx.restore()
  }

  function drawNode(n: GraphNode, ctx: CanvasRenderingContext2D) {
    if (isExchangeNode(n)) {
      drawExchangeNode(n, ctx)
      return
    }

    const x = (n as unknown as { x: number }).x
    const y = (n as unknown as { y: number }).y
    const r = nodeRadius(n, ctx)

    ctx.beginPath()
    ctx.arc(x, y, r, 0, 2 * Math.PI)
    ctx.fillStyle = nodeColor(n)
    ctx.fill()
    if (n.isRoot) {
      ctx.lineWidth = 0.6
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()
    }

    ctx.font = `600 ${NODE_FONT_SIZE}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#0f172a'
    ctx.fillText(nodeText(n), x, y + 0.3)
  }

  function paintNodePointerArea(n: GraphNode, color: string, ctx: CanvasRenderingContext2D) {
    const x = (n as unknown as { x: number }).x
    const y = (n as unknown as { y: number }).y
    ctx.beginPath()
    ctx.arc(x, y, nodeRadius(n, ctx), 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()
  }

  function nodeLabel(n: GraphNode): string {
    const lines: string[] = [n.id]
    if (n.entity) {
      const level = attributionLevel(n.entity.source_confidence)
      const levelLabel = level === 'confirmed' ? 'Confirmed' : level === 'likely' ? 'Likely' : 'Unknown'
      lines.push(`🏷 ${n.entity.name} (${n.entity.type}) — ${levelLabel}, ${formatSource(n.entity.source)}`)
    }
    if (n.labels?.length) lines.push(n.labels.map((l) => l.name).join(', '))
    if (n.isForwarding) lines.push('⚠ potential fund forwarding (heuristic)')
    if (n.isCluster) lines.push('⚠ potential wallet cluster (heuristic)')
    return lines.join('\n')
  }

  useEffect(() => {
    const fg = fgRef.current
    if (!fg || graphData.nodes.length === 0) return
    // Wider charge repulsion and link distance than the library defaults so
    // nodes fan out around the root instead of clumping into an unreadable
    // clump — matches the spaced-out radial layout Arkham uses for trace graphs.
    fg.d3Force('charge')?.strength(-260)
    const linkForce = fg.d3Force('link')
    if (linkForce) linkForce.distance(90)
    fg.d3Force('collide', createCollideForce(26))
    fg.d3ReheatSimulation()
  }, [graphData])

  return (
    // Breaks out of AppShell's centered max-w-6xl container so the trace
    // canvas can use the full viewport width instead of being boxed into a
    // narrow centered column — matches Arkham's full-bleed visualizer layout.
    <div className="relative left-1/2 right-1/2 -mx-[50vw] flex min-h-0 w-screen flex-1 flex-col gap-4 px-6">
      <Card className="relative min-h-0 flex-1 overflow-hidden">
        {/* Overlaid on the canvas's own top-left corner, not a separate row
            above it: an address search to re-root the trace without going
            back to the header, plus a "Filters" button that reveals
            Direction/Depth/Min value in a popover instead of always-visible
            chips. */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          <form onSubmit={handleAddressSearch} className="relative">
            <Input
              value={addressQuery}
              onChange={(e) => setAddressQuery(e.target.value)}
              placeholder="Search wallet address (0x...)"
              className="h-8 w-64 rounded-full bg-card/90 font-mono text-xs backdrop-blur-sm"
            />
            {addressError && (
              <p className="absolute top-full left-3 mt-1 text-xs text-destructive">{addressError}</p>
            )}
          </form>

          {address && (
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 rounded-full bg-card/90 text-xs backdrop-blur-sm"
                  />
                }
              >
                <SlidersHorizontal className="size-3.5" />
                Filters
              </PopoverTrigger>
              <PopoverContent className="flex w-72 flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">Chain</span>
                  <Select value={String(chainId)} onValueChange={(v) => updateFilter('chain_id', v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NETWORKS.map((n) => (
                        <SelectItem key={n.id} value={String(n.id)}>
                          {n.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">Direction</span>
                  <Select value={direction} onValueChange={(v) => updateFilter('direction', v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="out">Outgoing</SelectItem>
                      <SelectItem value="in">Incoming</SelectItem>
                      <SelectItem value="all">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">Depth: {depth}</span>
                  <Slider
                    value={[depth]}
                    min={1}
                    max={5}
                    step={1}
                    onValueChange={(v) => updateFilter('depth', String(Array.isArray(v) ? v[0] : v))}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">Min value</span>
                  <Input value={minValue} onChange={(e) => updateFilter('min_value', e.target.value)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">Asset (token contract)</span>
                  <Input
                    value={asset}
                    onChange={(e) => updateFilter('asset', e.target.value.trim())}
                    placeholder="All assets"
                    className="font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">From</span>
                  <Input
                    type="datetime-local"
                    value={isoToLocalInputValue(from)}
                    onChange={(e) => updateFilter('from', localInputValueToIso(e.target.value))}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">To</span>
                  <Input
                    type="datetime-local"
                    value={isoToLocalInputValue(to)}
                    onChange={(e) => updateFilter('to', localInputValueToIso(e.target.value))}
                  />
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <CardContent className="min-h-0 flex-1 p-0">
          {!address && (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 text-center">
              <Waypoints className="size-8 text-muted-foreground/50" strokeWidth={1.5} />
              <p className="max-w-xs text-sm text-muted-foreground">
                Search a wallet address above to visualize its fund-flow graph.
              </p>
            </div>
          )}
          {address && trace.isLoading && <Skeleton className="h-full min-h-[400px] w-full" />}
          {address && trace.isError && <p className="p-6 text-sm text-destructive">Failed to load trace.</p>}
          {address && trace.data && (
            <ForceGraph2D
              ref={fgRef}
              graphData={graphData}
              nodeId="id"
              nodeLabel={nodeLabel}
              nodeCanvasObject={drawNode}
              nodeCanvasObjectMode={() => 'replace'}
              nodePointerAreaPaint={paintNodePointerArea}
              linkColor={() => 'rgba(148, 163, 184, 0.6)'}
              linkDirectionalArrowColor={() => '#cbd5e1'}
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={1}
              linkLabel={(l: GraphLink) => `${formatDisplayAmount(l.edge)} (${shortenAddress(l.edge.token_address)})`}
              onEngineStop={() => fgRef.current?.zoomToFit(400, 60)}
              onNodeClick={(n: GraphNode) => navigate(`/trace/${n.id}?${searchParams.toString()}`)}
              onLinkClick={(l: GraphLink) => setSelectedEdge(l.edge)}
            />
          )}
        </CardContent>

        {/* Legend overlaid on the canvas's own top-right corner (mirroring
            the filter chips at top-left) instead of a separate row below it
            — bottom-right would sit past the fold now that the canvas
            fills the full viewport height, requiring a scroll to see it. */}
        {address && (
          <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1 rounded-lg bg-card/80 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm">
            <span className="flex items-center gap-1.5">
              Root wallet <span className="size-2.5 rounded-full" style={{ backgroundColor: '#34d399' }} />
            </span>
            <span className="flex items-center gap-1.5">
              Potential fund forwarding{' '}
              <span className="size-2.5 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
            </span>
            <span className="flex items-center gap-1.5">
              Potential wallet cluster <span className="size-2.5 rounded-full" style={{ backgroundColor: '#a855f7' }} />
            </span>
            <span className="flex items-center gap-1.5">
              Known entity <span className="size-2.5 rounded-full" style={{ backgroundColor: '#38bdf8' }} />
            </span>
            <span className="flex items-center gap-1.5">
              Exchange (badge instead of address — hover to see it)
              <span
                className="flex size-2.5 items-center justify-center rounded-full text-[6px] font-bold"
                style={{ backgroundColor: '#334155', color: '#fff' }}
              >
                BN
              </span>
            </span>
            <span className="text-muted-foreground/70">Heuristics — not proof of common ownership</span>
          </div>
        )}
      </Card>

      <Sheet open={selectedEdge !== null} onOpenChange={(open) => !open && setSelectedEdge(null)}>
        <SheetContent side="left" className="gap-0 overflow-y-auto">
          <SheetHeader className="border-b">
            <SheetTitle>Transfer detail</SheetTitle>
          </SheetHeader>
          {selectedEdge && (
            <div className="flex flex-col gap-6 p-4 text-sm">
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span className="text-[11px] tracking-wide text-muted-foreground uppercase">From</span>
                  <span className="truncate font-mono text-xs" title={selectedEdge.from}>
                    {shortenAddress(selectedEdge.from)}
                  </span>
                </div>
                <ArrowRight className="mx-2 size-4 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span className="text-[11px] tracking-wide text-muted-foreground uppercase">To</span>
                  <span className="truncate font-mono text-xs" title={selectedEdge.to}>
                    {shortenAddress(selectedEdge.to)}
                  </span>
                </div>
              </div>

              <section className="flex flex-col gap-3">
                <SectionLabel>Amount</SectionLabel>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2.5">
                    <TokenIcon symbol={selectedEdge.token_symbol} />
                    <p className="font-mono text-lg font-medium break-all">
                      {selectedEdge.token_decimals === undefined && '~'}
                      {formatTokenAmount(selectedEdge.amount, selectedEdge.token_decimals ?? ASSUMED_DECIMALS_FALLBACK)}{' '}
                      {selectedEdge.token_symbol || ''}
                    </p>
                  </div>
                  {selectedEdge.token_decimals !== undefined ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Raw: {selectedEdge.amount} base units ({selectedEdge.token_decimals} decimals)
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-500">
                      ~ Assumed {ASSUMED_DECIMALS_FALLBACK} decimals (most Ethereum tokens use this) — this token's
                      real decimals() hasn't been indexed yet, so it's a guess, not confirmed. Raw:{' '}
                      {selectedEdge.amount} base units. Could be off for tokens like USDT/USDC (6 decimals).
                    </p>
                  )}
                </div>
                <CopyField
                  label={selectedEdge.token_symbol ? `Token contract (${selectedEdge.token_symbol})` : 'Token contract'}
                  value={selectedEdge.token_address}
                />
              </section>

              <section className="flex flex-col gap-3">
                <SectionLabel>Transaction</SectionLabel>
                <CopyField label="Hash" value={selectedEdge.transaction_hash} />
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Block" value={selectedEdge.block_number.toLocaleString()} />
                  <Stat
                    label="Time"
                    value={new Date(selectedEdge.timestamp).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  />
                </div>

                {selectedTx.isLoading && (
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                )}
                {selectedTx.isError && (
                  <p className="text-xs text-destructive">Failed to load gas/status detail for this transaction.</p>
                )}
                {selectedTx.data && (
                  <div className="grid grid-cols-2 gap-3">
                    <Stat
                      label="Status"
                      value={
                        <Badge variant={selectedTx.data.status === 'success' ? 'default' : 'destructive'}>
                          {selectedTx.data.status}
                        </Badge>
                      }
                    />
                    <Stat
                      label="Gas fee"
                      value={
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Fuel className="size-3 text-muted-foreground" />
                          {formatGasFeeEth(selectedTx.data.gas_used, selectedTx.data.gas_price)} ETH
                        </span>
                      }
                    />
                  </div>
                )}
              </section>

              <section className="flex flex-col gap-3">
                <SectionLabel>Full addresses</SectionLabel>
                <CopyField label="From" value={selectedEdge.from} />
                <CopyField label="To" value={selectedEdge.to} />
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{children}</h3>
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  const { copied, copy } = useCopyToClipboard()

  return (
    <div className="rounded-lg border p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div className="mt-0.5 flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate font-mono text-xs">{value}</p>
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon-sm" className="shrink-0" onClick={() => copy(value)} />}
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </TooltipTrigger>
          <TooltipContent>Copy {label.toLowerCase()}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

// gasUsed * gasPrice is in wei; gas is always paid in native ETH regardless
// of which token was transferred, so dividing by 1e18 is always correct here
// (unlike the transfer amount, whose decimals depend on the token contract).
function formatGasFeeEth(gasUsed: number, gasPriceWei: string): string {
  try {
    const feeWei = BigInt(gasUsed) * BigInt(gasPriceWei)
    const whole = feeWei / 1_000_000_000_000_000_000n
    const fraction = feeWei % 1_000_000_000_000_000_000n
    return `${whole}.${fraction.toString().padStart(18, '0').slice(0, 6)}`
  } catch {
    return '—'
  }
}
