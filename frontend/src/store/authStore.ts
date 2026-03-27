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
 * ║  • Storage key: "leto-auth"                                     ║
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
    { name: 'leto-auth' }
  )
)
