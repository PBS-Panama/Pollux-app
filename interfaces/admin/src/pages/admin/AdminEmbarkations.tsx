/**
 * AdminEmbarkations.tsx — E-2 (Handover.md nota 63/68/70): the verification
 * queue. Filterable list of embarkations by verification_status; each row
 * opens AdminEmbarkationDetail.tsx, where the actual pipeline (contact log,
 * dropzone, conclude/revert/reopen, remarks) lives.
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

interface EmbarkationRow {
  id: string
  seafarer_id: string
  seafarer_email: string | null
  seafarer_first_name: string | null
  seafarer_last_name: string | null
  declared_vessel_name: string
  declared_company_name: string
  declared_rank: string
  verification_status: string
  verification_attempts: number
  verification_deadline_at: string | null
  has_correction: boolean
  created_at: string | null
}

const STATUS_LABEL: Record<string, string> = {
  declarado: 'Declarado',
  en_verificacion: 'En verificación',
  verificado: 'Verificado',
  no_verificable: 'No verificable',
  observado: 'Observado',
}

const STATUS_STYLE: Record<string, string> = {
  declarado: 'text-white/40 bg-white/[0.05] border-white/10',
  en_verificacion: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
  verificado: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
  no_verificable: 'text-red-400 bg-red-400/10 border-red-400/25',
  observado: 'text-violet-400 bg-violet-400/10 border-violet-400/25',
}

export default function AdminEmbarkations() {
  const navigate = useNavigate()
  const [items, setItems] = useState<EmbarkationRow[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/embarkations', { params: status ? { verification_status: status } : {} })
      .then(r => setItems(r.data.items))
      .finally(() => setLoading(false))
  }, [status])

  useEffect(() => { load() }, [load])

  const seafarerName = (e: EmbarkationRow) =>
    (e.seafarer_first_name || e.seafarer_last_name)
      ? `${e.seafarer_first_name ?? ''} ${e.seafarer_last_name ?? ''}`.trim()
      : (e.seafarer_email ?? e.seafarer_id)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Embarques — verificación</h2>
          <p className="text-white/40 text-xs mt-0.5">{items.length} en la cola{status ? ` · filtro: ${STATUS_LABEL[status]}` : ''}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="bg-[#0b1220] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-cyan-400/50">
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>

      {/* 2026-09-16 (Rick nota 77/79, confirmed live at 744px): the table
          had no horizontal scroll of its own, so at narrow widths columns
          past the second were simply unreachable. overflow-x-auto on this
          inner wrapper (not the outer rounded container, which needs to
          keep overflow-hidden for the rounded corners) gives the table
          somewhere to scroll instead of clipping. */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] text-[11px] text-white/35 uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Marino</th>
              <th className="px-4 py-3 text-left">Buque declarado</th>
              <th className="px-4 py-3 text-left">Naviera declarada</th>
              <th className="px-4 py-3 text-left">Rango</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Intentos</th>
              <th className="px-4 py-3 text-left">Plazo</th>
              <th className="px-4 py-3 text-left">Creado</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-white/30 text-sm">Cargando…</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-white/30 text-sm">Sin embarques para este filtro</td></tr>
            )}
            {!loading && items.map((e, i) => (
              <tr key={e.id}
                className={`border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer ${i % 2 === 0 ? '' : 'bg-white/[0.015]'}`}
                onClick={() => navigate(`/admin/embarkations/${e.id}`)}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-cyan-400/15 border border-cyan-400/20 flex items-center justify-center text-xs font-bold text-cyan-400 flex-shrink-0">
                      {seafarerName(e)[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="font-medium text-white/85">{seafarerName(e)}</p>
                      {e.seafarer_email && <p className="text-[11px] text-white/35">{e.seafarer_email}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-white/60">
                  {e.declared_vessel_name}
                  {e.has_correction && (
                    <span className="ml-1.5 text-[10px] text-amber-400/70" title="La verificación corrigió el dato declarado">✎</span>
                  )}
                </td>
                <td className="px-4 py-3 text-white/60">{e.declared_company_name}</td>
                <td className="px-4 py-3 text-white/50 uppercase text-xs">{e.declared_rank}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${STATUS_STYLE[e.verification_status] ?? 'text-white/40 bg-white/[0.05] border-white/10'}`}>
                    {STATUS_LABEL[e.verification_status] ?? e.verification_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/50 text-xs">{e.verification_attempts}/10</td>
                <td className="px-4 py-3 text-white/35 text-xs">
                  {e.verification_deadline_at ? new Date(e.verification_deadline_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-white/35 text-xs">
                  {e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
