import { Navigate } from 'react-router-dom'
import { useUser } from '../lib/auth'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser()

  if (loading) return <div>Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
