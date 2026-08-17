import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { isValidAddress, shortenAddress } from '@/lib/address'
import { useDebounce } from '@/lib/useDebounce'
import { getNetwork, type ChainId } from '@/lib/network'
import { Input } from '@/components/ui/input'
import { TokenIcon } from '@/components/TokenIcon'

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 250

// The header's global search — chain-agnostic by design (see discuss.txt):
// it resolves an address or entity name to a specific address, and never
// asks the caller which chain, because "which address" and "which chain"
// are separate decisions. The address/wallet page owns the chain choice.
export function SearchBox() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const debouncedQuery = useDebounce(query.trim(), DEBOUNCE_MS)
  const suggestions = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => api.search(debouncedQuery),
    enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
  })

  function goToAddress(address: string) {
    setError(null)
    setIsOpen(false)
    setQuery('')
    navigate(`/address/${address}`)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const address = query.trim()
    if (!isValidAddress(address)) {
      setError('Invalid Ethereum address')
      return
    }
    goToAddress(address)
  }

  const showDropdown =
    isOpen &&
    debouncedQuery.length >= MIN_QUERY_LENGTH &&
    (suggestions.isLoading || (suggestions.data?.length ?? 0) > 0)

  return (
    <form onSubmit={handleSubmit} className="relative flex-1">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setError(null)
        }}
        onFocus={() => {
          if (blurTimeout.current) clearTimeout(blurTimeout.current)
          setIsOpen(true)
        }}
        onBlur={() => {
          // A suggestion row's click needs to land before the dropdown
          // disappears — an immediate close on blur fires first and eats
          // the click, so give it one tick via a short delay instead.
          blurTimeout.current = setTimeout(() => setIsOpen(false), 150)
        }}
        placeholder="Search wallet address or entity name (0x... or Titan Builder)"
        className="max-w-xl font-mono text-sm"
        autoComplete="off"
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}

      {showDropdown && (
        <div className="absolute top-full left-0 z-20 mt-1.5 w-full max-w-xl overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {suggestions.isLoading && <div className="px-3 py-2.5 text-xs text-muted-foreground">Searching…</div>}
          {!suggestions.isLoading &&
            suggestions.data?.map((item) => (
              <button
                key={item.address}
                type="button"
                // mousedown fires before the input's blur — preventDefault
                // stops focus from ever leaving the input, so the blur
                // timeout above never even needs to run for this path.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => goToAddress(item.address)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted"
              >
                <div className="flex min-w-0 flex-col">
                  {item.entity ? (
                    <>
                      <span className="truncate text-sm font-medium text-foreground">{item.entity.name}</span>
                      <span className="truncate font-mono text-[11px] text-muted-foreground">
                        {shortenAddress(item.address)}
                      </span>
                    </>
                  ) : (
                    <span className="truncate font-mono text-sm text-foreground">{item.address}</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {item.entity && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground uppercase">
                      {item.entity.type}
                    </span>
                  )}
                  {item.chains?.map((chainId) => {
                    const network = getNetwork(chainId as ChainId)
                    return (
                      <span key={chainId} title={network.shortName}>
                        <TokenIcon symbol={network.nativeSymbol} size={14} />
                      </span>
                    )
                  })}
                </div>
              </button>
            ))}
        </div>
      )}
    </form>
  )
}
