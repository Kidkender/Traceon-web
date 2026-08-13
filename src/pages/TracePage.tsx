import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ForceGraph2D from 'react-force-graph-2d'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { api, type TraceDirection, type TraceEdge } from '@/lib/api'
import { shortenAddress } from '@/lib/address'

interface GraphNode {
  id: string
}

interface GraphLink {
  source: string
  target: string
  edge: TraceEdge
}

export function TracePage() {
  const { address } = useParams<{ address: string }>()
  const navigate = useNavigate()
  if (!address) return null

  const [direction, setDirection] = useState<TraceDirection>('out')
  const [depth, setDepth] = useState(2)
  const [minValue, setMinValue] = useState('0')
  const [selectedEdge, setSelectedEdge] = useState<TraceEdge | null>(null)

  const trace = useQuery({
    queryKey: ['trace', address, direction, depth, minValue],
    queryFn: () => api.trace(address, { direction, depth, min_value: minValue }),
  })

  const graphData = useMemo(() => {
    if (!trace.data) return { nodes: [] as GraphNode[], links: [] as GraphLink[] }
    return {
      nodes: trace.data.nodes.map((n) => ({ id: n.address })),
      links: trace.data.edges.map((e) => ({ source: e.from, target: e.to, edge: e })),
    }
  }, [trace.data])

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Direction</span>
            <Select value={direction} onValueChange={(v) => setDirection(v as TraceDirection)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="out">Outgoing</SelectItem>
                <SelectItem value="in">Incoming</SelectItem>
                <SelectItem value="all">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex min-w-40 items-center gap-2">
            <span className="text-sm text-muted-foreground">Depth: {depth}</span>
            <Slider
              value={[depth]}
              min={1}
              max={5}
              step={1}
              onValueChange={(v) => setDepth(Array.isArray(v) ? v[0] : v)}
              className="w-32"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Min value</span>
            <Input
              value={minValue}
              onChange={(e) => setMinValue(e.target.value)}
              className="w-28"
            />
          </div>

          {trace.data?.truncated && (
            <span className="text-xs text-amber-500">Result truncated — refine filters to see more.</span>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {trace.isLoading && <Skeleton className="h-[600px] w-full" />}
          {trace.isError && <p className="p-6 text-sm text-destructive">Failed to load trace.</p>}
          {trace.data && (
            <ForceGraph2D
              height={600}
              graphData={graphData}
              nodeId="id"
              nodeLabel={(n: GraphNode) => n.id}
              nodeAutoColorBy={(n: GraphNode) => (n.id === address ? 'root' : 'other')}
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={1}
              linkLabel={(l: GraphLink) => `${l.edge.amount} (${shortenAddress(l.edge.token_address)})`}
              onNodeClick={(n: GraphNode) => navigate(`/trace/${n.id}`)}
              onLinkClick={(l: GraphLink) => setSelectedEdge(l.edge)}
            />
          )}
        </CardContent>
      </Card>

      <Sheet open={selectedEdge !== null} onOpenChange={(open) => !open && setSelectedEdge(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Transfer detail</SheetTitle>
          </SheetHeader>
          {selectedEdge && (
            <div className="flex flex-col gap-3 px-4 text-sm">
              <Field label="Transaction hash" value={selectedEdge.transaction_hash} />
              <Field label="Token" value={selectedEdge.token_address} />
              <Field label="From" value={selectedEdge.from} />
              <Field label="To" value={selectedEdge.to} />
              <Field label="Amount" value={selectedEdge.amount} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-mono break-all">{value}</p>
    </div>
  )
}
