/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  api.ts — Axios HTTP Client (Backend Communication)             ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                  ║
 * ║  Singleton Axios instance. Base URL "/api" — nginx (prod) or the ║
 * ║  Vite dev proxy forwards it to FastAPI. Same origin, no CORS.    ║
 * ║                                                                  ║
 * ║  INTERCEPTORS:                                                   ║
 * ║  • Request  → auto-attaches "Authorization: Bearer <JWT>"       ║
 * ║  • Response → on 401 from a protected call: logout + redirect   ║
 * ║    to /login?next=<current path>. A 401 from /auth/login itself  ║
 * ║    (wrong password) is left to the form to display.              ║
 * ║                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register']

// On 401 from a protected endpoint → logout and go to the login page
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status
    const url: string = error.config?.url ?? ''
    const isAuthCall = AUTH_ENDPOINTS.some((p) => url.includes(p))

    if (status === 401 && !isAuthCall) {
      useAuthStore.getState().logout()
      if (!window.location.pathname.startsWith('/login')) {
        const next = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/login?next=${next}`
      }
    }
    return Promise.reject(error)
  }
)

export default api
