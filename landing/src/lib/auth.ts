/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  auth.ts — Sign-in / sign-up flow shared by /login, /register    ║
 * ║  and the DEV quick-login bar.                                    ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                  ║
 * ║  registerCompany(name, email, password) → POST /auth/register    ║
 * ║  {role:"company"}, then signIn(). See pages/Register.tsx.        ║
 * ║                                                                  ║
 * ║  signIn(email, password, companyName?):                          ║
 * ║   1. POST /api/auth/login → { access_token, refresh_token }     ║
 * ║   2. GET  /api/auth/me    → user profile                        ║
 * ║   3. Store JWT + user in Zustand (persisted)                    ║
 * ║   4. Non-admin: write the identity bridge (`pollux-user`) read  ║
 * ║      by the /company/ iframe (company crewing SPA)              ║
 * ║                                                                  ║
 * ║  2026-09-04: /login is company-only (no role toggle), so it       ║
 * ║  collects company name alongside email + password. The backend    ║
 * ║  (routers/auth.py) checks it against the account's Company row     ║
 * ║  for role="company" — same generic 401 as a wrong password.        ║
 * ║  Ignored server-side for admin/seafarer accounts, so passing        ║
 * ║  undefined here (e.g. from the DEV quick-login) is harmless.       ║
 * ║                                                                  ║
 * ║  POLLUX ONLY: this container has no Castor Express API           ║
 * ║  (/crewing-api/), so there is no per-user folder to initialise.  ║
 * ║  Castor's landing does that step on its own domain.              ║
 * ║                                                                  ║
 * ║  destinationFor(role) → where to send the user afterwards.       ║
 * ║  loginErrorMessage(err) → Spanish copy for 401 / 422 / network.  ║
 * ║                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import api from './api'
import { useAuthStore, CREW_USER_KEY, type AuthUser } from '../store/authStore'

export type LoginRole = 'seafarer' | 'company'

export function destinationFor(role: string | undefined): string {
  return role === 'admin' ? '/admin' : '/dashboard'
}

/** Only allow same-origin relative paths as post-login redirects. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next) return null
  if (!next.startsWith('/') || next.startsWith('//')) return null
  if (next.startsWith('/login') || next.startsWith('/register')) return null
  return next
}

/**
 * Company self-registration, then auto sign-in.
 *
 * The backend's RegisterRequest (schemas/auth.py) only needs `email`,
 * `password`, `role` and `company_name` for role="company" — every other
 * field on that schema (first_name, rank, fleet_category…) is seafarer-only
 * and is never read for a company account. Confirmed against
 * routers/auth.py `register()`.
 */
export async function registerCompany(companyName: string, email: string, password: string): Promise<AuthUser> {
  await api.post('/auth/register', { email, password, role: 'company', company_name: companyName })
  return signIn(email, password, companyName)
}

export async function signIn(email: string, password: string, companyName?: string): Promise<AuthUser> {
  const { data: tokens } = await api.post('/auth/login', { email, password, company_name: companyName })
  const { data: user } = await api.get<AuthUser>('/auth/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  useAuthStore.getState().login(user, tokens.access_token, tokens.refresh_token)

  if (user.role !== 'admin') {
    // Identity bridge for the crewing SPA inside the /company/ iframe.
    localStorage.setItem(CREW_USER_KEY, JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role,
      rank: user.rank ?? null,
      fleet_category: user.fleet_category ?? null,
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
      date_of_birth: user.date_of_birth ?? null,
      seafarer_code: user.seafarer_code ?? null,
    }))
  }
  return user
}

export function loginErrorMessage(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { detail?: unknown } } }
  const status = e?.response?.status
  const detail = e?.response?.data?.detail
  if (status === 401) return 'Empresa, usuario o contraseña incorrectos. Verifica tus datos.'
  if (status === 422) return 'Formato de correo inválido.'
  if (status === 403) return 'Tu cuenta está suspendida. Contacta a soporte.'
  if (typeof detail === 'string' && detail) return detail
  return 'No pudimos conectar con el servidor. Intenta de nuevo.'
}
