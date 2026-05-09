import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Wraps protected routes — shows a loading screen while auth is being checked,
 * then either renders the child or redirects to /login.
 * This prevents the flash of the login page on refresh.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // If we have a cached user (from localStorage), render immediately
  // even if the background auth check is still running.
  // If the session turns out to be expired, AuthContext will clear the user
  // and this component will then redirect to /login.
  if (user) {
    return children
  }

  // No cached user and auth check still in progress — show loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4E8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#09090B] border-t-[#D2E823] rounded-full animate-spin" />
          <p className="font-mono text-xs uppercase tracking-widest opacity-60">Authenticating...</p>
        </div>
      </div>
    )
  }

  // Auth check complete — no user found → redirect
  return <Navigate to="/login" replace />
}
