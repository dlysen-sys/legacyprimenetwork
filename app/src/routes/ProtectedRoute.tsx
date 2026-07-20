import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

// Gate for private routes: redirects to /login when there's no session.
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return null // or a spinner
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
