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
import {
  BarChart2,
  BookOpen,
  Files,
  Layers3,
  LoaderCircle,
} from 'lucide-react'
import PropTypes from 'prop-types'

import { getOverviewStats } from '../api/client'

function Dashboard({ documents, onOpenDocument, onToast }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)

    const loadStats = async () => {
      try {
        const result = await getOverviewStats()
        if (active) {
          setStats(result)
        }
      } catch (error) {
        if (active) {
          onToast(error.response?.data?.detail || 'Could not load dashboard', 'error')
          setStats(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadStats()

    return () => {
      active = false
    }
  }, [documents, onToast])

  if (loading) {
    return <LoadingDashboard />
  }

  if (!stats) {
    return <EmptyDashboard />
  }

  const recentRows = [...documents].sort(sortByUploadedAt).slice(0, 6)
  const pageLookup = Object.fromEntries(
    stats.top_documents.map((item) => [item.filename, item.pages])
  )

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Files} label="Total Documents" value={stats.total_documents} tone="emerald" />
        <StatCard icon={Layers3} label="Total Chunks" value={stats.total_chunks} tone="sky" />
        <StatCard icon={BookOpen} label="Total Pages" value={stats.total_pages} tone="amber" />
        <StatCard
          icon={BarChart2}
          label="Avg Chunks / Doc"
          value={stats.avg_chunks_per_doc}
          tone="rose"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <ChartCard title="Documents uploaded per day">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.documents_by_date}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top documents by chunk count">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.top_documents} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis
                dataKey="filename"
                type="category"
                width={130}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={truncateLabel}
              />
              <Tooltip />
              <Bar dataKey="chunk_count" fill="#334155" radius={[0, 10, 10, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Recent documents</p>
            <p className="text-xs text-slate-500">A quick snapshot of recently uploaded files.</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {stats.storage_used_kb.toFixed(1)} KB indexed
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-[0.18em] text-slate-400">
                <th className="pb-3 font-semibold">Filename</th>
                <th className="pb-3 font-semibold">Pages</th>
                <th className="pb-3 font-semibold">Chunks</th>
                <th className="pb-3 font-semibold">Uploaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentRows.map((document) => (
                <tr
                  key={document.id}
                  className="cursor-pointer transition hover:bg-slate-50"
                  onClick={() => onOpenDocument(document)}
                >
                  <td className="py-3 text-sm font-medium text-slate-900">{document.filename}</td>
                  <td className="py-3 text-sm text-slate-500">{pageLookup[document.filename] ?? '--'}</td>
                  <td className="py-3 text-sm text-slate-500">{document.chunk_count}</td>
                  <td className="py-3 text-sm text-slate-500">
                    {new Intl.DateTimeFormat(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    }).format(new Date(document.uploaded_at))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, tone }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-600',
    sky: 'bg-sky-50 text-sky-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  }

  return (
    <article className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tones[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </article>
  )
}

function ChartCard({ title, children }) {
  return (
    <article className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <p className="mb-4 text-sm font-semibold text-slate-900">{title}</p>
      {children}
    </article>
  )
}

function LoadingDashboard() {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-[32px] border border-white/70 bg-white/88">
      <div className="flex items-center gap-3 text-slate-500">
        <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
        Loading dashboard
      </div>
    </div>
  )
}

function EmptyDashboard() {
  return (
    <div className="rounded-[32px] border border-dashed border-slate-200 bg-white/88 p-10 text-center text-slate-500">
      Dashboard data will appear after documents are indexed.
    </div>
  )
}

function sortByUploadedAt(left, right) {
  return new Date(right.uploaded_at).getTime() - new Date(left.uploaded_at).getTime()
}

function formatShortDate(value) {
  return value.slice(5)
}

function truncateLabel(value) {
  return value.length > 18 ? `${value.slice(0, 18)}...` : value
}

Dashboard.propTypes = {
  documents: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      filename: PropTypes.string.isRequired,
      chunk_count: PropTypes.number.isRequired,
      uploaded_at: PropTypes.string.isRequired,
    })
  ).isRequired,
  onOpenDocument: PropTypes.func.isRequired,
  onToast: PropTypes.func.isRequired,
}

StatCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  tone: PropTypes.oneOf(['emerald', 'sky', 'amber', 'rose']).isRequired,
}

ChartCard.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
}

export default Dashboard
