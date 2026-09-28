/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  authStore.ts — Global Auth State (Zustand + LocalStorage)      ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                  ║
 * ║  Central JWT store used by Login, Register, Dashboard,          ║
 * ║  ProtectedRoute, AdminGuard and the api.ts interceptor.          ║
 * ║                                                                  ║
 * ║  • login()  → saves user + tokens, persisted to localStorage    ║
 * ║  • logout() → clears store + the crewing-module bridge keys     ║
 * ║  • Zustand "persist" middleware → survives page refresh          ║
 * ║                                                                  ║
 * ║  STORAGE KEYS — shared with the crewing SPA (`interfaces/leto/`,  ║
 * ║  see docs/architecture/AUTH-FLOW.md) — renaming them breaks the  ║
 * ║  identity bridge unless every reader/writer changes together.   ║
 * ║  Renamed from leto-* to pollux-* on 2026-09-14 (Rick: drop the   ║
 * ║  "Leto" brand everywhere it's safe to — zero real users, zero    ║
 * ║  cost today). If you add a NEW reader/writer, use these exports, ║
 * ║  never a raw string literal — that's how leto-* survived here    ║
 * ║  as long as it did.                                              ║
 * ║                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Zustand persist key (JWT + user). Read by the crewing SPA boot guard. */
export const AUTH_STORAGE_KEY = 'pollux-auth'
/** Identity bridge consumed by the crewing SPA (`getUserId()`). */
export const CREW_USER_KEY = 'pollux-user'
/** Profile cache written by MyProfile inside the crewing SPA. */
export const CREW_PROFILE_KEY = 'pollux-profile-extra'

export interface AuthUser {
  id: string
  email: string
  role: 'seafarer' | 'company' | 'admin' | string
  company_id: string | null
  rank?: string | null
  fleet_category?: string | null
  first_name?: string | null
  last_name?: string | null
  date_of_birth?: string | null
  seafarer_code?: string | null
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  login: (user: AuthUser, accessToken: string, refreshToken: string) => void
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
      logout: () => {
        try {
          localStorage.removeItem(CREW_USER_KEY)
          localStorage.removeItem(CREW_PROFILE_KEY)
        } catch { /* storage unavailable */ }
        set({ user: null, accessToken: null, refreshToken: null })
      },
    }),
    { name: AUTH_STORAGE_KEY }
  )
)

/**
 * Synchronous read of the persisted session. Zustand's persist middleware
 * hydrates asynchronously, so guards use this to avoid bouncing a logged-in
 * user to /login on the very first render.
 */
export function readPersistedSession(): { accessToken: string | null; user: AuthUser | null } {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return { accessToken: null, user: null }
    const parsed = JSON.parse(raw)
    return {
      accessToken: parsed?.state?.accessToken ?? null,
      user: parsed?.state?.user ?? null,
    }
  } catch {
    return { accessToken: null, user: null }
  }
}
