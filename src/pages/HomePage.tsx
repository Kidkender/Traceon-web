export function HomePage() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Trace any Ethereum wallet</h1>
      <p className="max-w-md text-muted-foreground">
        Search a wallet address above to see its balance, transaction history, and fund-flow graph.
      </p>
    </div>
  )
}
