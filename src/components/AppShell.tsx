import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
          <a href="/" className="text-lg font-semibold tracking-tight">
            Traceon
          </a>
          <form onSubmit={handleSearch} className="flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search wallet address (0x...)"
              className="max-w-xl"
            />
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
