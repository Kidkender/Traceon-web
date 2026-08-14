import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_CHAIN_ID, isChainId, type ChainId } from '@/lib/network'

const STORAGE_KEY = 'traceon:chain_id'

// The app has no URL search-param state anywhere else (routes are all path
// params), so localStorage is the more consistent place to persist this
// than introducing URL query state just for the network picker.
function readStoredChainId(): ChainId {
  if (typeof window === 'undefined') return DEFAULT_CHAIN_ID
  const raw = Number(window.localStorage.getItem(STORAGE_KEY))
  return isChainId(raw) ? raw : DEFAULT_CHAIN_ID
}

interface NetworkContextValue {
  chainId: ChainId
  setChainId: (id: ChainId) => void
}

const NetworkContext = createContext<NetworkContextValue | null>(null)

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [chainId, setChainId] = useState<ChainId>(() => readStoredChainId())

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(chainId))
  }, [chainId])

  const value = useMemo(() => ({ chainId, setChainId }), [chainId])

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
}

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext)
  if (!ctx) throw new Error('useNetwork must be used within NetworkProvider')
  return ctx
}
