const stats = [
  { label: 'Direction filters', value: 'in / out / all' },
  { label: 'Max trace depth', value: '5 hops' },
  { label: 'Heuristics', value: '2 active' },
]

export function HomePage() {
  return (
    <div className="flex flex-col items-center gap-8 py-20 text-center sm:py-28">
      <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs tracking-wide text-primary">
        ETHEREUM MAINNET · LIVE
      </span>

      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Trace the flow of funds across any Ethereum wallet
      </h1>

      <p className="max-w-lg text-muted-foreground">
        Search a wallet above to see its balance, transaction history, and an interactive graph of where its funds
        came from — and where they went.
      </p>

      <div className="grid w-full max-w-xl grid-cols-3 divide-x divide-border overflow-hidden rounded-lg border border-border">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-1 px-4 py-4">
            <span className="font-mono text-sm font-medium text-primary">{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
