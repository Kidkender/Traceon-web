import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { NETWORKS } from '@/lib/network'
import { TokenIcon } from '@/components/TokenIcon'

const productLinks = [
  { label: 'Wallet Explorer', to: '/' },
  { label: 'Fund Flow Tracer', to: '/' },
  { label: 'Entity Labels', to: '/' },
]

const resourceLinks = [
  { label: 'GitHub', href: 'https://github.com' },
  { label: 'API Reference', href: '#' },
  { label: 'Status', href: '#' },
]

// "Not affiliated with any Foundation" (plural, generic) instead of naming
// one chain — the app spans every network in NETWORKS, and this disclaimer
// no longer has a single "current chain" to hang off (see discuss.txt: chain
// is a per-page concern now, not global app state).
export function Footer({ minimal = false }: { minimal?: boolean }) {
  // Tool pages (trace/wallet) want vertical space for the data, not a
  // marketing footer — same legal disclaimer and copyright, just without
  // the logo/tagline/link columns that only make sense as a landing-page
  // sitemap.
  if (minimal) {
    return (
      <footer className="mt-auto border-t border-border bg-card/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Traceon. Not affiliated with any underlying network foundation.</p>
          <p className="max-w-2xl">
            Entity labels, fund-forwarding, and wallet-cluster flags are heuristics — not proof of ownership,
            custody, or wrongdoing.
          </p>
        </div>
      </footer>
    )
  }

  return (
    <footer className="mt-auto border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
            <Logo />
            <p className="max-w-[22ch] text-sm text-muted-foreground">
              On-chain wallet intelligence and fund-flow tracing across chains.
            </p>
          </div>

          <FooterColumn title="Product">
            {productLinks.map((l) => (
              <Link key={l.label} to={l.to} className="hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </FooterColumn>

          <FooterColumn title="Resources">
            {resourceLinks.map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="hover:text-foreground">
                {l.label}
              </a>
            ))}
          </FooterColumn>

          <FooterColumn title="Networks">
            {NETWORKS.map((n) => (
              <span key={n.id} className="flex items-center gap-1.5">
                <TokenIcon symbol={n.nativeSymbol} size={14} />
                {n.shortName}
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              </span>
            ))}
          </FooterColumn>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Traceon. Not affiliated with any underlying network foundation.</p>
          <p className="max-w-2xl">
            Entity labels, fund-forwarding, and wallet-cluster flags are heuristics derived from on-chain patterns —
            not proof of ownership, custody, or wrongdoing. Verify independently before acting on them.
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      <div className="flex flex-col gap-2 text-sm text-muted-foreground/90">{children}</div>
    </div>
  )
}
