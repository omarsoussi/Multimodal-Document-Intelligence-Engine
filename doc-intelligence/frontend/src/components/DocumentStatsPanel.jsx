import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Lightbulb, LoaderCircle, X } from 'lucide-react'
import PropTypes from 'prop-types'

import { getDocumentStats } from '../api/client'

function DocumentStatsPanel({ docId, filename, onClose, onToast }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    setStats(null)

    const loadDocumentStats = async () => {
      try {
        const result = await getDocumentStats(docId)
        if (active) {
          setStats(result)
        }
      } catch (error) {
        if (active) {
          onToast(error.response?.data?.detail || 'Could not load document stats', 'error')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadDocumentStats()

    return () => {
      active = false
    }
  }, [docId, onToast])

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[2px]">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close stats panel" />
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-white/70 bg-white/96 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate-950">{filename}</p>
            <p className="mt-1 text-sm text-slate-500">Document analytics overview</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        {loading && <LoadingState />}
        {!loading && stats && (
          <div className="space-y-5">
            <section className="grid gap-3 sm:grid-cols-3">
              <SummaryPill label="Estimated words" value={`${stats.estimated_word_count.toLocaleString()} words`} />
              <SummaryPill label="Pages" value={stats.total_pages} />
              <SummaryPill label="Chunks" value={stats.total_chunks} />
            </section>

            <PanelCard title="Chunks per page">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={stats.chunks_per_page}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="page" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="chunk_count" fill="#34d399" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </PanelCard>

            <PanelCard title="Top keywords">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={stats.top_keywords.slice(0, 10)}
                  layout="vertical"
                  margin={{ left: 12 }}
                >
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis dataKey="word" type="category" width={110} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#475569" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </PanelCard>

            <section>
              <p className="mb-3 text-sm font-semibold text-slate-900">Insights</p>
              <div className="space-y-2">
                {buildInsights(stats).map((insight) => (
                  <div
                    key={insight}
                    className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-slate-600"
                  >
                    <Lightbulb className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </aside>
    </div>
  )
}

function buildInsights(stats) {
  const heaviestPage = [...stats.chunks_per_page].sort((left, right) => right.chunk_count - left.chunk_count)[0]
  const readingMinutes = Math.max(1, Math.floor(stats.estimated_word_count / 250))
  return [
    stats.avg_chunk_length > 400
      ? `Dense document: avg ${Math.round(stats.avg_chunk_length)} chars per chunk`
      : 'Concise document: short, digestible chunks',
    heaviestPage ? `Heavy on page ${heaviestPage.page}` : 'Evenly distributed page density',
    `~${readingMinutes} min read`,
  ]
}

function SummaryPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function PanelCard({ title, children }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
      <p className="mb-3 text-sm font-semibold text-slate-900">{title}</p>
      {children}
    </section>
  )
}

function LoadingState() {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-slate-50/70 text-slate-500">
      <div className="flex items-center gap-3">
        <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
        Loading analytics
      </div>
    </div>
  )
}

DocumentStatsPanel.propTypes = {
  docId: PropTypes.string.isRequired,
  filename: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onToast: PropTypes.func.isRequired,
}

SummaryPill.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
}

PanelCard.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
}

export default DocumentStatsPanel
