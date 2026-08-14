import { useNavigate } from 'react-router-dom'
import { ArrowRight, GitBranch, ShieldAlert, Waypoints } from 'lucide-react'
import { useNetwork } from '@/lib/NetworkContext'
import { getNetwork } from '@/lib/network'

const features = [
  {
    icon: Waypoints,
    label: 'Direction filters',
    value: 'in / out / all',
    description: 'Follow funds forward, backward, or in every direction at once.',
  },
  {
    icon: GitBranch,
    label: 'Max trace depth',
    value: '5 hops',
    description: 'Walk the fund-flow graph up to five wallets deep from the root.',
  },
  {
    icon: ShieldAlert,
    label: 'Heuristics',
    value: '2 active',
    description: 'Surfaces potential fund-forwarding and wallet-cluster patterns.',
  },
]

const exampleWallets = [
  { label: 'Binance hot wallet', address: '0x28c6c06298d514db089934071355e5743bf21d60' },
  { label: 'Coinbase hot wallet', address: '0x71660c4005ba85c37ccec55d0c4493e66fe775d3' },
  { label: 'Kraken hot wallet', address: '0x2910543af39aba0cd09dbb2d50200b3e0256726' },
]

export function HomePage() {
  const navigate = useNavigate()
  const { chainId } = useNetwork()
  const network = getNetwork(chainId)

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
            <span className="font-mono text-lg font-medium text-foreground">{f.value}</span>
            <span className="text-sm font-medium text-muted-foreground">{f.label}</span>
            <p className="text-xs text-muted-foreground/80">{f.description}</p>
          </div>
        ))}
      </section>
    </div>
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
