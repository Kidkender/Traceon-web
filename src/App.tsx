import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { HomePage } from '@/pages/HomePage'
import { WalletPage } from '@/pages/WalletPage'
import { TracePage } from '@/pages/TracePage'
import { EntityPage } from '@/pages/EntityPage'

// Preserves old shared/bookmarked /wallets/:address links after the route
// rename to /address/:address — the page covers contracts too, not just
// wallets, so /address/ is the accurate name going forward.
function LegacyWalletRedirect() {
  const { address } = useParams<{ address: string }>()
  return <Navigate to={`/address/${address}`} replace />
}

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/address/:address" element={<WalletPage />} />
        <Route path="/wallets/:address" element={<LegacyWalletRedirect />} />
        <Route path="/entity/:id" element={<EntityPage />} />
        <Route path="/trace" element={<TracePage />} />
        <Route path="/trace/:address" element={<TracePage />} />
      </Routes>
    </AppShell>
  )
}

export default App
