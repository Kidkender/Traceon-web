import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { HomePage } from '@/pages/HomePage'
import { WalletPage } from '@/pages/WalletPage'
import { TracePage } from '@/pages/TracePage'

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/wallets/:address" element={<WalletPage />} />
        <Route path="/trace/:address" element={<TracePage />} />
      </Routes>
    </AppShell>
  )
}

export default App
