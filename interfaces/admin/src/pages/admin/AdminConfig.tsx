import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import ApiKeysTab from './ApiKeysTab'
import AdminSecretsManager from './AdminSecretsManager'

interface Setting { key: string; value: string; description: string | null; updated_at: string | null }
interface CatalogDoc { id: number; name: string; cert: string; level: string; cert_type: string; validity_years: number | null; is_required: boolean }
interface RankEntry { count: number; fleet_cat: string; docs: CatalogDoc[] }
type Catalog = Record<string, RankEntry>

const LEVEL_COLOR: Record<string, string> = {
  critical: 'text-red-400',
  high:     'text-amber-400',
  standard: 'text-cyan-400',
}
const CERT_TYPE_LABELS: Record<string, string> = {
  'C/R': 'Certificate Required',
  'D/P': 'Documentary Proof',
  'T/O': 'Training Onboard',
  'E/R': 'Endorsement Required',
}

const SETTING_META: Record<string, { label: string; unit: string; hint: string }> = {
  expiry_critical_days:  { label: 'Critical Warning',         unit: 'days', hint: 'Days before expiry to flag a document as CRITICAL (red)' },
  expiry_warning_days:   { label: 'Expiry Warning',           unit: 'days', hint: 'Days before expiry to flag a document as EXPIRING (yellow)' },
  doc_max_size_mb:       { label: 'Max Upload Size',          unit: 'MB',   hint: 'Maximum file size allowed for document uploads' },
  compliance_alert_days: { label: 'Compliance Alert Window',  unit: 'days', hint: 'Days window shown on the Compliance Monitor expiry alerts table' },
}

const FLEET_ORDER = ['merchant', 'offshore', 'fishing', 'yacht', 'national']
const FLEET_LABELS: Record<string, string> = {
  merchant: 'Marina Mercante', offshore: 'Offshore / MOU',
  fishing: 'Pesquero', yacht: 'Yates / Recreo', national: 'Aguas Nacionales',
}

export default function AdminConfig() {
  const [tab, setTab] = useState<'settings' | 'catalog' | 'security'>('settings')
  // The Security tab is admin-only on the backend (403); don't offer it to a
  // session that isn't one.
  const isAdmin = useAuthStore((s) => s.user?.role) === 'admin'

  // ── Settings ──────────────────────────────────────────────────────
  const [settings, setSettings] = useState<Setting[]>([])
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const loadSettings = () => {
    setSettingsLoading(true)
    api.get('/admin/config/settings').then(r => setSettings(r.data)).catch(() => {}).finally(() => setSettingsLoading(false))
  }
  useEffect(() => { loadSettings() }, [])

  const startEdit = (s: Setting) => setEditing(e => ({ ...e, [s.key]: s.value }))
  const cancelEdit = (key: string) => setEditing(e => { const n = { ...e }; delete n[key]; return n })

  const saveSetting = async (key: string) => {
    const val = editing[key]
    if (val == null) return
    setSaving(s => ({ ...s, [key]: true }))
    try {
      await api.patch(`/admin/config/settings/${key}`, { value: val })
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value: val } : s))
      cancelEdit(key)
    } catch { } finally { setSaving(s => ({ ...s, [key]: false })) }
  }

  // ── Catalog ───────────────────────────────────────────────────────
  const [catalog, setCatalog] = useState<Catalog>({})
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [expandedRank, setExpandedRank] = useState<string | null>(null)
  const [rankSearch, setRankSearch] = useState('')

  const loadCatalog = () => {
    setCatalogLoading(true)
    api.get('/admin/config/catalog').then(r => setCatalog(r.data)).catch(() => {}).finally(() => setCatalogLoading(false))
  }

  useEffect(() => {
    if (tab === 'catalog' && Object.keys(catalog).length === 0) loadCatalog()
  }, [tab])

  const rankEntries = Object.entries(catalog)
  const filteredRanks = rankSearch
    ? rankEntries.filter(([r]) => r.toLowerCase().includes(rankSearch.toLowerCase()))
    : rankEntries

  const grouped: Record<string, [string, RankEntry][]> = {}
  filteredRanks.forEach(([rank, entry]) => {
    const fleet = entry.fleet_cat || 'merchant'
    if (!grouped[fleet]) grouped[fleet] = []
    grouped[fleet].push([rank, entry])
  })

  const inp = 'bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-400/40'

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">

      <div>
        <h2 className="text-xl font-bold text-white"><i className="iconoir-settings mr-2" aria-hidden="true" />Platform Configuration</h2>
        <p className="text-xs text-white/30 mt-0.5">Platform settings and STCW rank compliance catalog</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1 w-fit">
        {(['settings', 'catalog', 'security'] as const).filter(t => t !== 'security' || isAdmin).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${tab === t ? 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/20' : 'text-white/35 hover:text-white/60'}`}>
            {t === 'settings' ? 'Platform Settings' : t === 'catalog' ? `Rank Catalog (${Object.keys(catalog).length})` : 'Security'}
          </button>
        ))}
      </div>

      {/* ── SETTINGS TAB ────────────────────────────────────────── */}
      {tab === 'settings' && (
        <div className="flex flex-col gap-3">
          {settingsLoading
            ? <p className="text-white/25 text-sm py-8 text-center">Loading…</p>
            : settings.map(s => {
              const meta = SETTING_META[s.key]
              const isEditing = s.key in editing
              return (
                <div key={s.key} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-semibold text-white/75">{meta?.label ?? s.key}</p>
                    <p className="text-xs text-white/30 mt-0.5">{meta?.hint ?? s.description ?? ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <input
                          className={`${inp} w-28 text-center`}
                          value={editing[s.key]}
                          onChange={e => setEditing(ed => ({ ...ed, [s.key]: e.target.value }))}
                        />
                        {meta?.unit && <span className="text-xs text-white/30">{meta.unit}</span>}
                        <button
                          onClick={() => saveSetting(s.key)}
                          disabled={saving[s.key]}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${saving[s.key] ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-400/40' : 'border-cyan-400/30 bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-400'}`}>
                          {saving[s.key] ? '…' : 'Save'}
                        </button>
                        <button onClick={() => cancelEdit(s.key)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-white/35 border border-white/10">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-base font-bold text-white/85 min-w-[2.5rem] text-right tabular-nums">{s.value}</span>
                        {meta?.unit && <span className="text-xs text-white/30">{meta.unit}</span>}
                        <button onClick={() => startEdit(s)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-white/40 border border-white/10 transition-colors">
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          }
        </div>
      )}

      {/* ── SECURITY TAB — una pantalla: claves de terceros + Secret Manager (T13) ── */}
      {tab === 'security' && isAdmin && (
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-bold text-white/60 uppercase tracking-wide mb-3">Claves de proveedores</h3>
            <ApiKeysTab />
          </div>
          <div className="border-t border-white/[0.06] pt-6">
            <h3 className="text-sm font-bold text-white/60 uppercase tracking-wide mb-3">Secret Manager</h3>
            <AdminSecretsManager />
          </div>
        </div>
      )}

      {/* ── CATALOG TAB ────────────────────────────────────────── */}
      {tab === 'catalog' && (
        <div className="flex flex-col gap-4">
          <div className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 mb-3">
            Este catálogo ya no es la fuente de verdad del cálculo de compliance — la membership vive en
            document_requirements.py (backend). Solo lectura.
          </div>

          <input
            value={rankSearch} onChange={e => setRankSearch(e.target.value)}
            placeholder="Filter by rank key…" className={`${inp} max-w-sm`}
          />

          {catalogLoading
            ? <p className="text-white/25 text-sm py-8 text-center">Loading…</p>
            : (
              <div className="flex flex-col gap-5">
                {FLEET_ORDER.filter(f => grouped[f]).map(fleet => (
                  <div key={fleet}>
                    <h3 className="text-[10px] font-bold tracking-widest uppercase text-white/25 mb-2">{FLEET_LABELS[fleet]}</h3>
                    <div className="flex flex-col gap-1.5">
                      {grouped[fleet].map(([rank, entry]) => {
                        const isExp = expandedRank === rank
                        return (
                          <div key={rank} className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
                            {/* Rank header */}
                            <button
                              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
                              onClick={() => setExpandedRank(isExp ? null : rank)}>
                              <div className="flex items-center gap-3">
                                <code className="text-[11px] font-mono text-cyan-400/70 bg-cyan-400/[0.08] px-2 py-0.5 rounded">{rank}</code>
                                <span className="text-xs text-white/35">{entry.count} docs required</span>
                              </div>
                              <span className={`text-white/25 text-xs transition-transform ${isExp ? 'rotate-90' : ''}`}>›</span>
                            </button>

                            {isExp && (
                              <div className="border-t border-white/[0.06] px-4 py-3 flex flex-col gap-1">
                                {/* Doc rows — read-only: the catalog no longer drives compliance (banner above) */}
                                {entry.docs.map((d) => (
                                  <div key={d.id} className="flex items-start gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                                    <span className={`text-[10px] font-bold uppercase min-w-[5rem] mt-0.5 ${LEVEL_COLOR[d.level] ?? 'text-white/30'}`}>
                                      {d.level}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-medium leading-snug ${d.is_required ? 'text-white/70' : 'text-white/25 line-through'}`}>{d.name}</p>
                                      <p className="text-[10px] text-white/30 mt-0.5">{d.cert}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="text-[10px] text-white/25 bg-white/[0.04] px-1.5 py-0.5 rounded">
                                        {CERT_TYPE_LABELS[d.cert_type] ?? d.cert_type}
                                      </span>
                                      {d.validity_years && (
                                        <p className="text-[10px] text-white/25 mt-0.5">{d.validity_years}y validity</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}
    </div>
  )
}
