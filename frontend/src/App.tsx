/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  App.tsx — Root Router                                          ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                  ║
 * ║  WORKFLOW:                                                       ║
 * ║  This is the entry point for all routing. The user flow is:      ║
 * ║                                                                  ║
 * ║  1. "/" → LandingPage (public marketing + login/register modals) ║
 * ║  2. "/dashboard" → Dashboard (protected, requires JWT)           ║
 * ║     └── Embeds Leto Crewing Module (/app/) via iframe             ║
 * ║  3. "/login", "/register" → Redirect to "/" (modals handle auth) ║
 * ║  4. "/*" → Catch-all redirect to "/"                             ║
 * ║                                                                  ║
 * ║  AUTH GUARD:                                                     ║
 * ║  ProtectedRoute checks for a valid JWT in Zustand store.         ║
 * ║  If no token → redirects to "/" where user can login via modal.  ║
 * ║                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
