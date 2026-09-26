import { Navigate, useLocation } from 'react-router-dom'
import { useUser } from '../lib/auth'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser()
  const location = useLocation()

  // Wait for Supabase to restore any saved session before deciding.
  if (loading) return null
  // Remember where the user was headed (e.g. /share?url=…) so login can send them back.
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />

  return <>{children}</>
}
