/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ProtectedRoute.tsx — JWT Auth Guard                            ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                  ║
 * ║  Wraps any route that requires authentication (e.g. /dashboard). ║
 * ║  • Token in store (or already persisted) → renders children     ║
 * ║  • No token → /login?next=<requested path>                      ║
 * ║                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, readPersistedSession } from '../store/authStore'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken)
  const location = useLocation()

  if (token || readPersistedSession().accessToken) return <>{children}</>

  const next = encodeURIComponent(location.pathname + location.search)
  return <Navigate to={`/login?next=${next}`} replace />
}
