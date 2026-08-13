import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/Logo'
import { Footer } from '@/components/Footer'
import { isValidAddress } from '@/lib/address'

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
      <Footer />
    </div>
  )
}
