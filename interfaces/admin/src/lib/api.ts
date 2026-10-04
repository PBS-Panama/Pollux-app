/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  api.ts — Axios HTTP Client (Backend Communication)             ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                  ║
 * ║  WORKFLOW:                                                       ║
 * ║  Singleton Axios instance shared by LoginModal, RegisterModal.   ║
 * ║  Base URL: "/api" (Vite proxies to backend at localhost:8000).   ║
 * ║                                                                  ║
 * ║  INTERCEPTORS:                                                   ║
 * ║  • Request  → auto-attaches "Authorization: Bearer <JWT>"       ║
 * ║  • Response → on 401, auto-logout + redirect to "/"             ║
 * ║                                                                  ║
 * ║  ENDPOINTS USED:                                                 ║
 * ║  • POST /api/auth/register — create seafarer account            ║
 * ║  • POST /api/auth/login    — get JWT tokens                     ║
 * ║  • GET  /api/auth/me       — fetch authenticated user profile   ║
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

// Sent by password-reauth calls (ApiKeysTab, AdminSecretsManager): the backend
// answers a wrong password with 401 too, which must show an error in the modal
// instead of logging the admin out.
export const REAUTH = { headers: { 'X-Reauth': '1' } }

// On 401 → logout and redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !error.config?.headers?.['X-Reauth']) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
