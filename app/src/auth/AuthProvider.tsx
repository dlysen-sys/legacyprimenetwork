import { createContext, useContext, type ReactNode } from 'react'
import { useAccount } from 'wagmi'

// Auth = wallet connection. `user` is the connected address (or null); the ProtectedRoute
// gate reads this. Contract-level "registered" gating layers on later (contract-integration).
export type User = { address: string } | null

type AuthState = { user: User; loading: boolean }

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount()
  const user = isConnected && address ? { address } : null
  const loading = isConnecting || isReconnecting

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
