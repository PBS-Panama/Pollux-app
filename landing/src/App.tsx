/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  App.tsx — Root Router                                          ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                  ║
 * ║  2026-09-12 (Rick): the navy/cyan LandingPage was NEVER the       ║
 * ║  approved design — the real, approved marketing site is the      ║
 * ║  static Appdent build at landing/site/, served directly by nginx ║
 * ║  at "/" (see landing/nginx.conf). This SPA no longer owns "/" —  ║
 * ║  it only mounts for the real auth pages nginx routes to it:      ║
 * ║  /login, /register, /dashboard. LandingPage.tsx, LoginModal.tsx  ║
 * ║  and RegisterModal.tsx are deleted — Login.tsx/Register.tsx      ║
 * ║  (already built, already styled to match landing/site/) replace  ║
 * ║  them and were just never wired up until now.                    ║
 * ║                                                                  ║
 * ║  ROUTES:                                                         ║
 * ║  /login, /register → Login / Register (company auth)            ║
 * ║  /forgot-password   → request a reset link (Handover.md nota 58) ║
 * ║  /reset-password    → set a new password from that link's token ║
 * ║  /verify-email      → confirms the emailed verification token   ║
 * ║  /dashboard         → Dashboard (seafarer/company — crewing)     ║
 * ║  *                  → back to "/" (the static site, outside      ║
 * ║                       this SPA's control)                        ║
 * ║                                                                  ║
 * ║  /admin/* is NOT handled here — nginx proxies it straight to     ║
 * ║  the separate `interfaces/admin` service (own Docker build, own  ║
 * ║  auth).                                                          ║
 * ║                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public auth ────────────────────────────────────── */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* ── Seafarer / Company ─────────────────────────────── */}
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
