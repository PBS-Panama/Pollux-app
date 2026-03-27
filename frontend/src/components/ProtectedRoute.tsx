/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ProtectedRoute.tsx — JWT Auth Guard                            ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                  ║
 * ║  WORKFLOW:                                                       ║
 * ║  Wraps any route that requires authentication (e.g. /dashboard). ║
 * ║  Checks Zustand authStore for a valid accessToken.               ║
 * ║                                                                  ║
 * ║  • Token exists → renders children normally                     ║
 * ║  • No token → redirects to "/" (LandingPage with login modal)   ║
 * ║                                                                  ║
 * ║  USED BY:                                                        ║
 * ║  App.tsx → <ProtectedRoute><Dashboard /></ProtectedRoute>       ║
 * ║                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken)

  // Zustand persist hydrates async — check localStorage directly as fallback
  // to avoid redirecting before hydration completes
  if (!token) {
    try {
      const raw = localStorage.getItem('leto-auth')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.state?.accessToken) {
          // Token exists in storage, Zustand just hasn't hydrated yet — render children
          return <>{children}</>
        }
      }
    } catch { /* ignore */ }
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
