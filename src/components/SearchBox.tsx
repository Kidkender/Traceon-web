import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, type SearchResultItem } from '@/lib/api'
import { isValidAddress, shortenAddress } from '@/lib/address'
import { useDebounce } from '@/lib/useDebounce'
import { getNetwork, type ChainId } from '@/lib/network'
import { TokenIcon } from '@/components/TokenIcon'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox'

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 250

// The header's global search — chain-agnostic by design (see discuss.txt):
// it resolves an address or entity name to a specific address, and never
// asks the caller which chain, because "which address" and "which chain"
// are separate decisions. The address/wallet page owns the chain choice.
//
// Built on Combobox instead of a hand-rolled dropdown so arrow-key
// navigation, Enter-to-select, and ARIA listbox semantics come for free
// instead of being reimplemented — the list itself is server-filtered
// (filter={null} disables Base UI's own client-side text matching, since
// an entity-name hit like "Titan Builder" wouldn't textually match the
// address it resolves to).
export function SearchBox() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cmd/Ctrl+K jumps to the search box from anywhere in the app — a
  // familiar shortcut on tools like this (Etherscan, Arkham) for power
  // users who don't want to reach for the mouse every time they look up
  // an address. preventDefault stops the browser's own bindings for the
  // key (Chrome's "focus address bar" on some platforms, Firefox's "quick
  // find") from firing instead.
  useEffect(() => {
    function handleGlobalKeyDown(e: globalThis.KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k') return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  const debouncedQuery = useDebounce(query.trim(), DEBOUNCE_MS)
  const suggestions = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => api.search(debouncedQuery),
    enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
  })

  function goToAddress(address: string) {
    setError(null)
    setOpen(false)
    setQuery('')
    navigate(`/address/${address}`)
  }

  // Fallback for typing a full address and hitting Enter before the
  // suggestion dropdown has anything to select (too short a query, or a
  // freshly-pasted address the debounce hasn't resolved yet) — same
  // "validate and navigate" behavior the search box had before suggestions
  // existed.
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || isDropdownVisible) return
    const address = query.trim()
    if (!isValidAddress(address)) {
      setError('Invalid Ethereum address')
      return
    }
    goToAddress(address)
  }

  const isDropdownVisible = open && debouncedQuery.length >= MIN_QUERY_LENGTH
  const items = suggestions.data ?? []

  return (
    <div className="max-w-xl flex-1">
      <Combobox<SearchResultItem>
        items={items}
        filter={null}
        inputValue={query}
        onInputValueChange={(value) => {
          setQuery(value)
          setError(null)
        }}
        itemToStringLabel={(item) => item.address}
        open={isDropdownVisible}
        onOpenChange={setOpen}
        onValueChange={(item) => {
          if (item) goToAddress(item.address)
        }}
      >
        <ComboboxInput
          ref={inputRef}
          placeholder="Search wallet address or entity name (0x... or Titan Builder)"
          className="font-mono text-sm"
          showTrigger={false}
          autoComplete="off"
          onKeyDown={handleKeyDown}
        />
        <ComboboxContent>
          <ComboboxEmpty>{suggestions.isLoading ? 'Searching…' : 'No results found.'}</ComboboxEmpty>
          <ComboboxList>
            {(item: SearchResultItem) => (
              <ComboboxItem key={item.address} value={item} className="justify-between pr-2">
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
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
