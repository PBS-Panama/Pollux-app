import { useEffect, useState } from 'react'
import api from '../../lib/api'

interface Setting { key: string; value: string; description: string | null; updated_at: string | null }
interface CatalogDoc { id: number; name: string; cert: string; level: string; cert_type: string; validity_years: number | null; is_required: boolean }
interface RankEntry { count: number; fleet_cat: string; docs: CatalogDoc[] }
type Catalog = Record<string, RankEntry>

interface EditForm { level: string; cert_type: string; validity_years: string; is_required: boolean }
interface AddForm { doc_name: string; cert: string; level: string; cert_type: string; validity_years: string; is_required: boolean }

const LEVEL_OPTIONS = ['critical', 'high', 'standard']
const CERT_TYPE_OPTIONS = ['C/R', 'D/P', 'T/O', 'E/R']

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
  const [tab, setTab] = useState<'settings' | 'catalog'>('settings')

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

  const [editingDoc, setEditingDoc] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ level: 'standard', cert_type: 'D/P', validity_years: '', is_required: true })

  const [addingToRank, setAddingToRank] = useState<string | null>(null)
  const [addForm, setAddForm] = useState<AddForm>({ doc_name: '', cert: '', level: 'standard', cert_type: 'D/P', validity_years: '', is_required: true })
  const [addError, setAddError] = useState('')
  const [saving2, setSaving2] = useState(false)
  const [actionError, setActionError] = useState('')

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

  const startEditDoc = (doc: CatalogDoc) => {
    setEditingDoc(doc.id)
    setEditForm({ level: doc.level, cert_type: doc.cert_type, validity_years: doc.validity_years != null ? String(doc.validity_years) : '', is_required: doc.is_required })
    setActionError('')
  }
  const cancelEditDoc = () => setEditingDoc(null)

  const saveEditDoc = async (docId: number) => {
    setSaving2(true)
    setActionError('')
    try {
      await api.patch(`/admin/config/catalog/${docId}`, {
        level: editForm.level,
        cert_type: editForm.cert_type,
        validity_years: editForm.validity_years ? Number(editForm.validity_years) : null,
        is_required: editForm.is_required,
      })
      setEditingDoc(null)
      loadCatalog()
    } catch (e: any) {
      setActionError(e?.response?.data?.detail ?? 'Failed to save document')
    } finally { setSaving2(false) }
  }

  const deleteDoc = async (docId: number) => {
    if (!window.confirm('Remove this document requirement?')) return
    setActionError('')
    try {
      await api.delete(`/admin/config/catalog/${docId}`)
      loadCatalog()
    } catch (e: any) {
      setActionError(e?.response?.data?.detail ?? 'Failed to delete document')
    }
  }

  const startAdd = (rank: string) => {
    setAddingToRank(rank)
    setAddForm({ doc_name: '', cert: '', level: 'standard', cert_type: 'D/P', validity_years: '', is_required: true })
    setAddError('')
  }
  const cancelAdd = () => { setAddingToRank(null); setAddError('') }

  const submitAdd = async (rank: string) => {
    if (!addForm.doc_name.trim()) { setAddError('Document name is required'); return }
    setSaving2(true)
    setAddError('')
    try {
      await api.post('/admin/config/catalog', {
        rank,
        doc_name: addForm.doc_name.trim(),
        cert: addForm.cert.trim(),
        level: addForm.level,
        cert_type: addForm.cert_type,
        validity_years: addForm.validity_years ? Number(addForm.validity_years) : null,
        is_required: addForm.is_required,
      })
      setAddingToRank(null)
      loadCatalog()
    } catch (e: any) {
      setAddError(e?.response?.data?.detail ?? 'Failed to add document')
    } finally { setSaving2(false) }
  }

  const inp = 'bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-400/40'
  const sel = `${inp} cursor-pointer`

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">

      <div>
        <h2 className="text-xl font-bold text-white"><i className="iconoir-settings mr-2" aria-hidden="true" />Platform Configuration</h2>
        <p className="text-xs text-white/30 mt-0.5">Platform settings and STCW rank compliance catalog</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1 w-fit">
        {(['settings', 'catalog'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${tab === t ? 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/20' : 'text-white/35 hover:text-white/60'}`}>
            {t === 'settings' ? 'Platform Settings' : `Rank Catalog (${Object.keys(catalog).length})`}
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

      {/* ── CATALOG TAB ────────────────────────────────────────── */}
      {tab === 'catalog' && (
        <div className="flex flex-col gap-4">
          <div className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 mb-3">
            Este catálogo ya no es la fuente de verdad del cálculo de compliance — la membership vive en
            document_requirements.py (backend). Edición deshabilitada hasta la Fase 2 completa.
          </div>

          {actionError && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded-lg p-3">
              {actionError}
            </div>
          )}

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
                                {/* Doc rows */}
                                {entry.docs.map((d) => (
                                  <div key={d.id}>
                                    {editingDoc === d.id ? (
                                      /* Inline Edit Form */
                                      <div className="flex flex-wrap gap-2 py-2.5 border-b border-white/[0.04] items-end">
                                        <div className="flex flex-col gap-1">
                                          <span className="text-[10px] text-white/30">Name</span>
                                          <span className="text-xs text-white/55 font-medium px-2 py-1.5 bg-white/[0.03] rounded border border-white/[0.06] min-w-[160px] max-w-[260px] truncate">{d.name}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-[10px] text-white/30">Level</span>
                                          <select className={`${sel} py-1.5 text-xs`} value={editForm.level}
                                            onChange={e => setEditForm(f => ({ ...f, level: e.target.value }))}>
                                            {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                                          </select>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-[10px] text-white/30">Cert Type</span>
                                          <select className={`${sel} py-1.5 text-xs`} value={editForm.cert_type}
                                            onChange={e => setEditForm(f => ({ ...f, cert_type: e.target.value }))}>
                                            {CERT_TYPE_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                          </select>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-[10px] text-white/30">Validity (yrs)</span>
                                          <input type="number" min="0" className={`${inp} py-1.5 w-20 text-xs`}
                                            value={editForm.validity_years} placeholder="—"
                                            onChange={e => setEditForm(f => ({ ...f, validity_years: e.target.value }))} />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-[10px] text-white/30">Required</span>
                                          <select className={`${sel} py-1.5 text-xs`} value={editForm.is_required ? 'yes' : 'no'}
                                            onChange={e => setEditForm(f => ({ ...f, is_required: e.target.value === 'yes' }))}>
                                            <option value="yes">Yes</option>
                                            <option value="no">No</option>
                                          </select>
                                        </div>
                                        <div className="flex gap-1 self-end pb-0.5">
                                          <button onClick={() => saveEditDoc(d.id)} disabled={saving2}
                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-cyan-400/30 bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-400 transition-colors disabled:opacity-40">
                                            {saving2 ? '…' : 'Save'}
                                          </button>
                                          <button onClick={cancelEditDoc}
                                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-white/35 border border-white/10">
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      /* Doc Row */
                                      <div className="flex items-start gap-3 py-1.5 border-b border-white/[0.04] last:border-0 group">
                                        <span className={`text-[10px] font-bold uppercase min-w-[5rem] mt-0.5 ${LEVEL_COLOR[d.level] ?? 'text-white/30'}`}>
                                          {d.level}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-xs font-medium leading-snug ${d.is_required ? 'text-white/70' : 'text-white/25 line-through'}`}>{d.name}</p>
                                          <p className="text-[10px] text-white/30 mt-0.5">{d.cert}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <div className="text-right">
                                            <span className="text-[10px] text-white/25 bg-white/[0.04] px-1.5 py-0.5 rounded">
                                              {CERT_TYPE_LABELS[d.cert_type] ?? d.cert_type}
                                            </span>
                                            {d.validity_years && (
                                              <p className="text-[10px] text-white/25 mt-0.5">{d.validity_years}y validity</p>
                                            )}
                                          </div>
                                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => startEditDoc(d)}
                                              className="px-2 py-1 rounded text-[10px] font-medium bg-white/[0.04] hover:bg-cyan-400/10 text-white/30 hover:text-cyan-400 border border-white/[0.06] transition-colors">
                                              Edit
                                            </button>
                                            <button onClick={() => deleteDoc(d.id)}
                                              className="px-2 py-1 rounded text-[10px] font-medium bg-white/[0.04] hover:bg-red-400/10 text-white/20 hover:text-red-400 border border-white/[0.06] transition-colors">
                                              ✕
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}

                                {/* Add form or Add button */}
                                {addingToRank === rank ? (
                                  <div className="mt-2 p-3 bg-cyan-400/[0.04] border border-cyan-400/15 rounded-lg flex flex-col gap-2">
                                    <p className="text-[10px] font-bold text-cyan-400/70 uppercase tracking-wider">Add Document to {rank}</p>
                                    {addError && <p className="text-[10px] text-red-400">{addError}</p>}
                                    <div className="flex flex-wrap gap-2">
                                      <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                                        <span className="text-[10px] text-white/30">Document Name *</span>
                                        <input className={`${inp} py-1.5 text-xs`} placeholder="e.g. Medical Fitness Certificate"
                                          value={addForm.doc_name} onChange={e => setAddForm(f => ({ ...f, doc_name: e.target.value }))} />
                                      </div>
                                      <div className="flex flex-col gap-1 flex-1 min-w-[130px]">
                                        <span className="text-[10px] text-white/30">Cert Code</span>
                                        <input className={`${inp} py-1.5 text-xs`} placeholder="e.g. STCW A-VI/1"
                                          value={addForm.cert} onChange={e => setAddForm(f => ({ ...f, cert: e.target.value }))} />
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-white/30">Level</span>
                                        <select className={`${sel} py-1.5 text-xs`} value={addForm.level}
                                          onChange={e => setAddForm(f => ({ ...f, level: e.target.value }))}>
                                          {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-white/30">Cert Type</span>
                                        <select className={`${sel} py-1.5 text-xs`} value={addForm.cert_type}
                                          onChange={e => setAddForm(f => ({ ...f, cert_type: e.target.value }))}>
                                          {CERT_TYPE_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-white/30">Validity (yrs)</span>
                                        <input type="number" min="0" className={`${inp} py-1.5 w-20 text-xs`}
                                          value={addForm.validity_years} placeholder="—"
                                          onChange={e => setAddForm(f => ({ ...f, validity_years: e.target.value }))} />
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-white/30">Required</span>
                                        <select className={`${sel} py-1.5 text-xs`} value={addForm.is_required ? 'yes' : 'no'}
                                          onChange={e => setAddForm(f => ({ ...f, is_required: e.target.value === 'yes' }))}>
                                          <option value="yes">Yes</option>
                                          <option value="no">No</option>
                                        </select>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                      <button onClick={() => submitAdd(rank)} disabled={saving2}
                                        className="px-4 py-1.5 rounded-lg text-xs font-semibold border border-cyan-400/30 bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-400 transition-colors disabled:opacity-40">
                                        {saving2 ? 'Adding…' : 'Add Document'}
                                      </button>
                                      <button onClick={cancelAdd}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-white/35 border border-white/10">
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button onClick={() => startAdd(rank)}
                                    className="mt-1 w-full py-2 rounded-lg text-[11px] text-white/25 hover:text-cyan-400/70 border border-dashed border-white/[0.06] hover:border-cyan-400/20 transition-colors text-center">
                                    + Add document to {rank}
                                  </button>
                                )}
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
