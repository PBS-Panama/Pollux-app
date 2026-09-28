import { useEffect, useState } from 'react'
import api from '../../lib/api'
import AdminOcrManager from './AdminOcrManager'

// ─── Types (Compliance Monitor) ──────────────────────────────────────────────

interface Summary {
  total_seafarers_with_rank: number
  avg_score: number
  fully_compliant: number
  critical_blocked: number
}
interface Distribution { labels: string[]; values: number[] }
interface RankRow { rank: string; count: number; avg_score: number }
interface ExpiryAlert {
  seafarer_name: string
  rank: string | null
  doc_name: string
  expiry_date: string
  days_left: number
  verification_status: string
}
interface OverviewData {
  summary: Summary
  distribution: Distribution
  rank_breakdown: RankRow[]
  expiry_alerts: ExpiryAlert[]
}

const VS_STYLES: Record<string, string> = {
  verified:     'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
  rejected:     'text-red-400 bg-red-400/10 border-red-400/25',
  under_review: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
  pending:      'text-white/40 bg-white/[0.05] border-white/10',
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: number | string }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 flex items-start gap-3">
      <div className="text-xl leading-none mt-0.5"><i className={icon} aria-hidden="true" /></div>
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-[11px] text-white/35 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function DistBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-white/[0.06] rounded-full h-2 overflow-hidden">
        <div className="h-full bg-cyan-400/50 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-white/40 w-4 text-right">{value}</span>
    </div>
  )
}

function ScoreGauge({ score }: { score: number }) {
  const color =
    score >= 76 ? 'text-emerald-400' :
    score >= 51 ? 'text-cyan-400' :
    score >= 26 ? 'text-amber-400' : 'text-red-400'
  return <span className={`font-bold text-xs ${color}`}>{score}%</span>
}

// ─── Compliance Monitor (existing content) ───────────────────────────────────

function ComplianceMonitor() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/compliance/overview')
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <p className="text-white/30 text-sm">Loading compliance data…</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <p className="text-white/30 text-sm">Failed to load compliance data.</p>
      </div>
    )
  }

  const maxDist = Math.max(...data.distribution.values, 1)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-7">
        <h2 className="text-xl font-bold text-white">Compliance Monitor</h2>
        <p className="text-white/40 text-xs mt-0.5">
          Platform-wide STCW compliance — scores based on admin-verified documents only
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
        <StatCard icon="iconoir-group" label="Seafarers with rank" value={data.summary.total_seafarers_with_rank} />
        <StatCard icon="iconoir-stats-report" label="Avg compliance score" value={`${data.summary.avg_score}%`} />
        <StatCard icon="iconoir-check-circle" label="Fully compliant" value={data.summary.fully_compliant} />
        <StatCard icon="iconoir-warning-triangle" label="Cannot be listed" value={data.summary.critical_blocked} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {/* Score distribution */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-[10px] font-bold tracking-widest uppercase text-white/30 mb-5">
            Score Distribution
          </h3>
          {data.summary.total_seafarers_with_rank === 0 ? (
            <p className="text-white/20 text-xs text-center py-6">No seafarers with ranks yet</p>
          ) : (
            data.distribution.labels.map((label, i) => (
              <div key={label} className="mb-4 last:mb-0">
                <div className="flex justify-between text-[11px] text-white/45 mb-1.5">
                  <span>{label}</span>
                </div>
                <DistBar value={data.distribution.values[i]} max={maxDist} />
              </div>
            ))
          )}
        </div>

        {/* Rank breakdown */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-[10px] font-bold tracking-widest uppercase text-white/30 mb-5">
            By Rank
          </h3>
          {data.rank_breakdown.length === 0 ? (
            <p className="text-white/20 text-xs text-center py-6">No data yet</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-white/25 uppercase tracking-wider border-b border-white/[0.06]">
                  <th className="text-left pb-2">Rank</th>
                  <th className="text-center pb-2">Count</th>
                  <th className="text-right pb-2">Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {data.rank_breakdown.map(row => (
                  <tr key={row.rank} className="border-b border-white/[0.03] last:border-0">
                    <td className="py-2.5 text-white/70 font-medium">{row.rank}</td>
                    <td className="py-2.5 text-center text-white/35">{row.count}</td>
                    <td className="py-2.5 text-right">
                      <ScoreGauge score={row.avg_score} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Expiry alerts */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between">
          <h3 className="text-[10px] font-bold tracking-widest uppercase text-white/30">
            Expiry Alerts — Next 90 Days
          </h3>
          <span className="text-[11px] text-white/25">{data.expiry_alerts.length} documents</span>
        </div>

        {data.expiry_alerts.length === 0 ? (
          <div className="px-5 py-10 text-center text-white/20 text-sm">
            No documents expiring in the next 90 days
          </div>
        ) : (
          /* 2026-09-16 (Rick nota 77/79) — overflow-x-auto so narrow viewports scroll instead of clipping */
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-white/30 uppercase tracking-wider border-b border-white/[0.05]">
                <th className="px-4 py-3 text-left">Seafarer</th>
                <th className="px-4 py-3 text-left">Document</th>
                <th className="px-4 py-3 text-left">Expiry</th>
                <th className="px-4 py-3 text-left">Days Left</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.expiry_alerts.map((a, i) => {
                const urgency =
                  a.days_left <= 7  ? 'text-red-400 font-bold' :
                  a.days_left <= 30 ? 'text-amber-400 font-semibold' :
                  a.days_left <= 60 ? 'text-yellow-300' : 'text-white/45'
                return (
                  <tr key={i} className={`border-b border-white/[0.04] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                    <td className="px-4 py-3">
                      <p className="text-white/75 text-xs font-medium">{a.seafarer_name}</p>
                      {a.rank && <p className="text-[10px] text-white/30">{a.rank}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/55">{a.doc_name}</td>
                    <td className="px-4 py-3 text-xs text-white/40">{a.expiry_date}</td>
                    <td className={`px-4 py-3 text-xs ${urgency}`}>{a.days_left}d</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${VS_STYLES[a.verification_status] ?? VS_STYLES.pending}`}>
                        {a.verification_status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab shell ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'monitor', label: 'Compliance Monitor' },
  { id: 'ocr',     label: 'OCR Rule Manager'   },
] as const

type TabId = typeof TABS[number]['id']

export default function AdminCompliance() {
  const [tab, setTab] = useState<TabId>('monitor')

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="border-b border-white/[0.07] px-6 flex gap-0.5 flex-none">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-xs font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-white/35 hover:text-white/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === 'monitor' ? <ComplianceMonitor /> : <AdminOcrManager />}
      </div>
    </div>
  )
}
