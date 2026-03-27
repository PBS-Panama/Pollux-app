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
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}
