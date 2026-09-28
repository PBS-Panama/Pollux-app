/**
 * NotificationBell.tsx — E-3, mitad de Pollux (Handover.md nota 63/71).
 *
 * GET /notifications/me is already self-scoped server-side (filters by
 * recipient_user_id from the JWT) — this admin bell and the company one in
 * interfaces/leto both call the exact same endpoint; the "two scopes" split
 * is which app renders it, not a backend parameter.
 *
 * requires_ack (only true for embarkation_verified_reverted, per
 * notification_dispatch.ACK_REQUIRED_KINDS) is treated as a hard gate here:
 * a notification with requires_ack=true is never dismissible by merely
 * marking it read — reading and acknowledging are separate calls
 * (PATCH .../read vs POST .../acknowledge), and the bell only offers the
 * "read" action for rows where requires_ack is false or already satisfied.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

interface NotificationItem {
  id: string
  recipient_scope: string
  company_id: string | null
  kind: string
  subject_type: string
  subject_id: string
  title: string
  body: string
  created_at: string | null
  read_at: string | null
  requires_ack: boolean
  acknowledged_at: string | null
}

function fmt(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `hace ${diffMin} min`
  if (diffMin < 1440) return `hace ${Math.round(diffMin / 60)} h`
  return d.toLocaleDateString()
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    api.get('/notifications/me').then(r => setItems(r.data.items)).catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const unreadCount = items.filter(n => !n.read_at).length

  const markRead = async (n: NotificationItem) => {
    if (n.read_at) return
    setBusyId(n.id)
    try {
      await api.patch(`/notifications/${n.id}/read`)
      load()
    } finally {
      setBusyId(null)
    }
  }

  const acknowledge = async (n: NotificationItem) => {
    setBusyId(n.id)
    try {
      await api.post(`/notifications/${n.id}/acknowledge`)
      load()
    } finally {
      setBusyId(null)
    }
  }

  const openEmbarkation = (n: NotificationItem) => {
    if (n.subject_type === 'embarkation') navigate(`/admin/embarkations/${n.subject_id}`)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white/85 hover:bg-white/[0.06] transition-colors"
        title="Notificaciones"
      >
        <i className="iconoir-bell text-base" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-h-[28rem] overflow-y-auto bg-[#0b1220] border border-white/10 rounded-xl shadow-2xl z-50">
          <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between">
            <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Notificaciones</p>
            <span className="text-[10px] text-white/30">{unreadCount} sin leer</span>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-white/25 text-xs">Sin notificaciones</p>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {items.map(n => {
                const pendingAck = n.requires_ack && !n.acknowledged_at
                return (
                  <div key={n.id}
                    className={`px-4 py-3 text-xs ${!n.read_at ? 'bg-cyan-400/[0.04]' : ''}`}>
                    <div className="flex items-start justify-between gap-2 cursor-pointer" onClick={() => { markRead(n); openEmbarkation(n) }}>
                      <div className="min-w-0">
                        <p className={`font-semibold ${!n.read_at ? 'text-white/90' : 'text-white/60'}`}>{n.title}</p>
                        <p className="text-white/40 mt-0.5 leading-snug">{n.body}</p>
                      </div>
                      <span className="text-[10px] text-white/25 flex-none">{fmt(n.created_at)}</span>
                    </div>
                    {pendingAck && (
                      <div className="mt-2 flex items-center justify-between gap-2 p-2 bg-amber-400/10 border border-amber-400/25 rounded-lg">
                        <span className="text-[11px] text-amber-300">Requiere acuse</span>
                        <button
                          type="button"
                          disabled={busyId === n.id}
                          onClick={(e) => { e.stopPropagation(); acknowledge(n) }}
                          className="px-2.5 py-1 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/30 text-amber-200 text-[11px] font-bold rounded disabled:opacity-40 transition-colors"
                        >
                          Acusar recibo
                        </button>
                      </div>
                    )}
                    {n.requires_ack && n.acknowledged_at && (
                      <p className="mt-1.5 text-[10px] text-emerald-400/70">✓ Acusado {fmt(n.acknowledged_at)}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
