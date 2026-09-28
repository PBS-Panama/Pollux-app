import { useEffect, useState } from 'react'
import api from '../../lib/api'

interface AnalyticsData {
  users: { total: number; seafarers: number; companies: number; admins: number; new_30d: number }
  documents: { total: number; new_30d: number; by_status: Record<string, number> }
  seafarers: { with_rank: number; without_rank: number; available: number; by_fleet_category: Record<string, number> }
  platform: {
    relationships_total: number; active_relationships: number;
    exam_courses_active: number; training_centers_active: number;
    learning_series_published: number;
  }
  daily_registrations: { date: string; count: number }[]
}

const FLEET_LABELS: Record<string, string> = {
  merchant: 'Mercante', offshore: 'Offshore', fishing: 'Pesca',
  yacht: 'Yate', national: 'Nacional', unknown: '—',
}
const FLEET_COLORS: Record<string, string> = {
  merchant: '#00d2d3', offshore: '#5b9cf6', fishing: '#4ade80',
  yacht: '#f59e0b', national: '#a78bfa', unknown: '#667788',
}
const DOC_STATUS_LABELS: Record<string, string> = {
  verified: 'Verified', rejected: 'Rejected', pending: 'Pending', under_review: 'Under Review',
}
const DOC_STATUS_COLORS: Record<string, string> = {
  verified: '#2ecc71', rejected: '#e74c3c', pending: '#f1c40f', under_review: '#5b9cf6',
}

function StatCard({ label, value, sub, icon }: { label: string; value: number | string; sub?: string; icon: string }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 flex items-start gap-3">
      <i className={`${icon} text-xl leading-none mt-0.5`} aria-hidden="true" />
      <div>
        <p className="text-xl font-bold text-white tabular-nums">{value}</p>
        <p className="text-xs text-white/40 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-white/25 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function HBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-white/40 w-20 shrink-0 text-right">{label}</span>
      <div className="flex-1 h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold text-white/60 w-8 tabular-nums">{value}</span>
    </div>
  )
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/analytics/overview')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-white/25 text-sm text-center">Loading analytics…</div>
  if (!data)   return <div className="p-8 text-white/20 text-sm text-center">Could not load analytics. Refresh to try again.</div>

  const { users, documents, seafarers, platform, daily_registrations } = data

  const totalDocs = documents.total || 1
  const maxFleet  = Math.max(...Object.values(seafarers.by_fleet_category), 1)
  const maxDay    = Math.max(...daily_registrations.map(d => d.count), 1)

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-8">

      <div>
        <h2 className="text-xl font-bold text-white"><i className="iconoir-stats-report mr-2" aria-hidden="true" />Analytics &amp; Monitoring</h2>
        <p className="text-xs text-white/30 mt-0.5">Platform-wide usage metrics and health overview</p>
      </div>

      {/* ── Users ─────────────────────────────────────────── */}
      <section>
        <h3 className="text-[10px] font-bold tracking-widest uppercase text-white/25 mb-3">Users</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon="iconoir-group" label="Seafarers"  value={users.seafarers}  />
          <StatCard icon="iconoir-building" label="Companies"  value={users.companies}  />
          <StatCard icon="iconoir-user" label="Total Users" value={users.total}     />
          <StatCard icon="iconoir-sparks" label="New (30d)"   value={users.new_30d}   />
        </div>
      </section>

      {/* ── Daily registrations (last 7d) ─────────────────── */}
      {daily_registrations.length > 0 && (
        <section>
          <h3 className="text-[10px] font-bold tracking-widest uppercase text-white/25 mb-3">Registrations — Last 7 days</h3>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-2">
            {daily_registrations.map(d => (
              <HBar key={d.date} label={d.date.slice(5)} value={d.count} max={maxDay} color="#00d2d3" />
            ))}
            {daily_registrations.length === 0 && (
              <p className="text-white/20 text-xs text-center py-2">No registrations in the last 7 days.</p>
            )}
          </div>
        </section>
      )}

      {/* ── Documents ─────────────────────────────────────── */}
      <section>
        <h3 className="text-[10px] font-bold tracking-widest uppercase text-white/25 mb-3">Documents</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard icon="iconoir-page" label="Total Documents" value={documents.total} />
          <StatCard icon="iconoir-sparks" label="Uploaded (30d)"  value={documents.new_30d} />
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-2">
          {Object.entries(documents.by_status).sort(([a], [b]) => {
            const ord: Record<string, number> = { verified: 0, under_review: 1, pending: 2, rejected: 3 }
            return (ord[a] ?? 9) - (ord[b] ?? 9)
          }).map(([st, cnt]) => (
            <div key={st} className="flex items-center gap-3">
              <span className="text-xs text-white/40 w-24 shrink-0 text-right">{DOC_STATUS_LABELS[st] ?? st}</span>
              <div className="flex-1 h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.round((cnt / totalDocs) * 100)}%`, background: DOC_STATUS_COLORS[st] ?? '#667788' }} />
              </div>
              <span className="text-xs font-semibold text-white/60 w-8 tabular-nums">{cnt}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Seafarers ─────────────────────────────────────── */}
      <section>
        <h3 className="text-[10px] font-bold tracking-widest uppercase text-white/25 mb-3">Seafarers</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatCard icon="iconoir-clipboard-check" label="With Rank"    value={seafarers.with_rank}    />
          <StatCard icon="iconoir-question-mark" label="No Rank"       value={seafarers.without_rank} />
          <StatCard icon="iconoir-check-circle" label="Available"     value={seafarers.available}    />
        </div>
        {Object.keys(seafarers.by_fleet_category).length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-2">
            <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold mb-1">By Fleet Category</p>
            {Object.entries(seafarers.by_fleet_category).sort(([,a], [,b]) => b - a).map(([cat, cnt]) => (
              <HBar key={cat} label={FLEET_LABELS[cat] ?? cat} value={cnt} max={maxFleet}
                color={FLEET_COLORS[cat] ?? '#667788'} />
            ))}
          </div>
        )}
      </section>

      {/* ── Platform ─────────────────────────────────────── */}
      <section>
        <h3 className="text-[10px] font-bold tracking-widest uppercase text-white/25 mb-3">Platform</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard icon="iconoir-link" label="Relationships"    value={platform.relationships_total}
            sub={`${platform.active_relationships} active`} />
          <StatCard icon="iconoir-graduation-cap" label="Exam Courses"     value={platform.exam_courses_active} />
          <StatCard icon="iconoir-building" label="Training Centers" value={platform.training_centers_active} />
          <StatCard icon="iconoir-book" label="Learning Series"  value={platform.learning_series_published}
            sub="published" />
        </div>
      </section>

    </div>
  )
}
