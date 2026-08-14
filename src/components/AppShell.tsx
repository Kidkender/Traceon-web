import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/Logo'
import { Footer } from '@/components/Footer'
import { isValidAddress } from '@/lib/address'

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isToolPage = location.pathname !== '/'
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    const address = query.trim()
    if (!isValidAddress(address)) {
      setError('Invalid Ethereum address')
      return
    }
    setError(null)
    navigate(`/wallets/${address}`)
  }

  return (
    // h-screen (not min-h-screen): a min-height only sets a floor, it
    // doesn't cap the page at the viewport, so a flex-1 content area with a
    // canvas that already has its own pixel height would still balloon the
    // whole page past 100vh. h-screen + overflow-hidden makes this outer
    // shell an exact viewport-sized box; `main` below scrolls internally
    // for pages with more content than fits (e.g. long transaction lists),
    // while a page like TracePage that wants to exactly fill the remaining
    // height (no page scroll) can now actually do that.
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="shrink-0 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3.5">
          <Link to="/" className="shrink-0">
            <Logo />
          </Link>
          <form onSubmit={handleSearch} className="flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search wallet address (0x...)"
              className="max-w-xl font-mono text-sm"
            />
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
          </form>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground sm:flex">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            Ethereum Mainnet
          </span>
        </div>
      </header>
      {/* `main` itself stays full-width and unconstrained — the max-w-6xl
          centering lives on the inner div instead. Setting overflow-y-auto
          directly on a max-w-6xl/mx-auto element made the browser force
          overflow-x to auto too (CSS spec: an explicit non-visible Y with
          visible X gets both promoted to auto), which broke TracePage's
          full-bleed -mx-[50vw] trick — with `main` clipping/scrolling
          horizontally, content pushed past the centered column's edge (the
          filter chips) was cut off instead of reaching the real viewport
          edge. Now `main` is exactly viewport-width, so a full-bleed child
          lines up with it exactly and never overflows it. */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col px-6 py-8">{children}</div>
      </main>
      <Footer minimal={isToolPage} />
    </div>
  )
}
