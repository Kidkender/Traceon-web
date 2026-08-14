import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Logo } from '@/components/Logo'
import { Footer } from '@/components/Footer'
import { isValidAddress } from '@/lib/address'
import { cn } from '@/lib/utils'
import { useNetwork } from '@/lib/NetworkContext'
import { NETWORKS, type ChainId } from '@/lib/network'

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isToolPage = location.pathname !== '/'
  // Only the trace visualizer wants an edge-to-edge canvas with the footer
  // pinned right below it (no page scroll). Every other page — including
  // WalletPage — should be normal document flow: content determines page
  // height, the footer follows right after it, and it only takes a scroll
  // to reach the footer when there's actually enough content to need one.
  // Forcing that same "fill the viewport, pin the footer" behavior onto a
  // short page (like the homepage) just glues the footer to the bottom
  // edge with a stretch of empty space above it, which reads as broken.
  const fillHeight = location.pathname.startsWith('/trace/')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { chainId, setChainId } = useNetwork()

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
    // fillHeight (TracePage only): h-screen + overflow-hidden makes this an
    // exact viewport-sized box, with `main` scrolling internally — needed
    // so the canvas can fill the remaining height exactly (no page scroll,
    // no gap above the footer). h-screen instead of min-h-screen matters
    // here specifically because a flex-1 area containing a canvas that
    // already set its own pixel height would otherwise balloon past 100vh
    // (min-height is only a floor, not a cap).
    // Everywhere else: plain min-h-screen, normal document flow — content
    // sets the page height and the footer follows right after it.
    <div
      className={cn(
        'flex flex-col bg-background text-foreground',
        fillHeight ? 'h-screen overflow-hidden' : 'min-h-screen'
      )}
    >
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
          <Select value={String(chainId)} onValueChange={(v) => setChainId(Number(v) as ChainId)}>
            <SelectTrigger className="hidden h-8 w-auto shrink-0 gap-1.5 rounded-full border-border px-2.5 py-1 text-xs sm:flex">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
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
      <main
        className={cn(
          'flex flex-col',
          fillHeight ? 'min-h-0 flex-1 overflow-y-auto' : ''
        )}
      >
        <div
          className={cn(
            'mx-auto w-full max-w-6xl px-6 py-8',
            fillHeight ? 'flex min-h-0 flex-1 flex-col' : ''
          )}
        >
          {children}
        </div>
      </main>
      <Footer minimal={isToolPage} />
    </div>
  )
}
