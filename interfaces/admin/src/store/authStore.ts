/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  authStore.ts — Global Auth State (Zustand + LocalStorage)      ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                  ║
 * ║  WORKFLOW:                                                       ║
 * ║  Central JWT store used by LoginModal, RegisterModal,            ║
 * ║  Dashboard, ProtectedRoute, and api.ts interceptor.              ║
 * ║                                                                  ║
 * ║  • login()  → saves user + tokens, persisted to localStorage    ║
 * ║  • logout() → clears all, triggers redirect to "/"              ║
 * ║  • Zustand "persist" middleware → survives page refresh          ║
 * ║  • Storage key: "pollux-auth"                                   ║
 * ║                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  role: string
  company_id: string | null
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  login: (user: User, accessToken: string, refreshToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      login: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    // Was 'admin-auth' — a copy-paste drift from landing's identical store
    // (the header comment above already said 'leto-auth', it just never got
    // applied here, 2026-09-10). That mismatch meant a real login via
    // Pollux's landing page could never actually authenticate this app:
    // after the redirect to /admin/, this store found no token under ITS
    // key and always fell through to App.tsx's hardcoded auto-login
    // instead, silently discarding whoever had actually just logged in.
    // Sharing the same key is what makes credentials entered on Pollux's
    // login form actually carry through to the admin panel. Renamed from
    // 'leto-auth' to 'pollux-auth' on 2026-09-14 (Rick: drop the "Leto"
    // brand) — keep this value matching landing/src/store/authStore.ts's
    // AUTH_STORAGE_KEY and the header comment above, always in the same
    // pass, or this exact bug comes back.
    { name: 'pollux-auth' }
  )
)
