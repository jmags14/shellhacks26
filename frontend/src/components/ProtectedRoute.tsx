import { Navigate } from 'react-router-dom'
import { useUser } from '../lib/auth'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser()

  // Wait for Supabase to restore any saved session before deciding.
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}
