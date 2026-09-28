/**
 * App.tsx — Admin-only mode (no login screen, auto-authenticates on mount)
 */

import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AdminShell from './pages/admin/AdminShell'
import AdminOverview from './pages/admin/AdminOverview'
import AdminSeafarers from './pages/admin/AdminSeafarers'
import AdminSeafarerDetail from './pages/admin/AdminSeafarerDetail'
import AdminCompanies from './pages/admin/AdminCompanies'
import AdminFleet from './pages/admin/AdminFleet'
import AdminDocuments from './pages/admin/AdminDocuments'
import AdminLearning from './pages/admin/AdminLearning'
import AdminCompliance from './pages/admin/AdminCompliance'
import AdminRelationships from './pages/admin/AdminRelationships'
import AdminExams from './pages/admin/AdminExams'
import AdminConfig from './pages/admin/AdminConfig'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminReviewQueue from './pages/admin/AdminReviewQueue'
import AdminOcrFeedback from './pages/admin/AdminOcrFeedback'
import AdminCvTemplate from './pages/admin/AdminCvTemplate'
import AdminEmbarkations from './pages/admin/AdminEmbarkations'
import AdminEmbarkationDetail from './pages/admin/AdminEmbarkationDetail'

export default function App() {
  const login = useAuthStore((s) => s.login)
  const accessToken = useAuthStore((s) => s.accessToken)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        // Validate existing token — must be valid AND have admin role
        if (accessToken) {
          const check = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          if (check.ok) {
            const me = await check.json()
            if (me.role === 'admin') { setReady(true); return }
            // Token is valid but wrong role (e.g. seafarer token leaked in) — re-auth
          }
          // Token invalid — fall through to re-authenticate
        }

        // Fresh login — fallback only, for visiting /admin/ directly with no
        // session at all. A real login via Pollux's landing page is picked
        // up above instead (same 'pollux-auth' storage key as this store).
        // Deliberately NOT the real admin password set up 2026-09-10 — that
        // credential is meant to be typed on Pollux's login form, never
        // baked into a client-visible JS bundle. Left pointing at the old
        // throwaway dev password; if it stops matching the DB, this
        // fallback simply fails closed (see the `if (!res.ok)` below) and a
        // direct /admin/ visit just requires a real login instead.
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@pbtradingsolutions.com', password: 'admins123' }),
        })
        if (!res.ok) { setReady(true); return }
        const { access_token, refresh_token } = await res.json()
        const meRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${access_token}` },
        })
        if (!meRes.ok) { setReady(true); return }
        const user = await meRes.json()
        login(user, access_token, refresh_token)
      } catch { /* backend unreachable — render anyway */ }
      setReady(true)
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#080e1c] text-white/30 text-sm">
        Conectando…
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />

        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<AdminOverview />} />
          <Route path="seafarers" element={<AdminSeafarers />} />
          <Route path="seafarers/:id" element={<AdminSeafarerDetail />} />
          <Route path="documents" element={<AdminDocuments />} />
          <Route path="review-queue" element={<AdminReviewQueue />} />
          <Route path="embarkations" element={<AdminEmbarkations />} />
          <Route path="embarkations/:id" element={<AdminEmbarkationDetail />} />
          <Route path="ocr-feedback" element={<AdminOcrFeedback />} />
          <Route path="compliance" element={<AdminCompliance />} />
          <Route path="exams" element={<AdminExams />} />
          <Route path="companies" element={<AdminCompanies />} />
          <Route path="fleet" element={<AdminFleet />} />
          <Route path="relationships" element={<AdminRelationships />} />
          <Route path="learning" element={<AdminLearning />} />
          <Route path="config" element={<AdminConfig />} />
          <Route path="cv-template" element={<AdminCvTemplate />} />
          <Route path="analytics" element={<AdminAnalytics />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
