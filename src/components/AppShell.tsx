import { Link, useLocation } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { Footer } from '@/components/Footer'
import { SearchBox } from '@/components/SearchBox'
import { cn } from '@/lib/utils'

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isToolPage = location.pathname !== '/'
  // Matches both the empty /trace (nav entry point, no address chosen yet)
  // and /trace/:address — startsWith('/trace/') alone misses the bare path.
  const isTracePage = location.pathname === '/trace' || location.pathname.startsWith('/trace/')
  // Only the trace visualizer wants an edge-to-edge canvas with the footer
  // pinned right below it (no page scroll). Every other page — including
  // WalletPage — should be normal document flow: content determines page
  // height, the footer follows right after it, and it only takes a scroll
  // to reach the footer when there's actually enough content to need one.
  // Forcing that same "fill the viewport, pin the footer" behavior onto a
  // short page (like the homepage) just glues the footer to the bottom
  // edge with a stretch of empty space above it, which reads as broken.
  const fillHeight = isTracePage

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
          <Link
            to="/trace"
            className={cn(
              'shrink-0 text-sm font-medium transition-colors hover:text-foreground',
              isTracePage ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            Visualization
          </Link>
          <SearchBox />
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
