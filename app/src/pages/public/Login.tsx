import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { ConnectButton } from '../../components/ConnectButton'
import { Card } from '../../components/ui/Card'
import { Logo } from '../../components/Logo'

export function Login() {
  const { user } = useAuth()

  // Already connected → straight to the dashboard.
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <section className="max-w-sm mx-auto px-6 py-24">
      <Card className="p-8 flex flex-col items-center gap-4 text-center">
        <Logo size={48} withWord={false} />
        <h1 className="text-2xl font-bold text-fg">Connect your wallet</h1>
        <p className="text-sm text-muted">Connect a BSC wallet to access your LegacyPrime account.</p>
        <ConnectButton />
      </Card>
    </section>
  )
}
