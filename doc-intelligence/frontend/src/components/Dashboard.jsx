import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BookMarked,
  Languages,
  LayoutDashboard,
  LoaderCircle,
  Tags,
} from 'lucide-react'
import PropTypes from 'prop-types'

import { getOverviewStats } from '../api/client'

const CHART_COLORS = ['#d14e3f', '#f08b4a', '#0f766e', '#3b82f6', '#7c3aed', '#fbbf24']

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

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={LayoutDashboard} label="Indexed documents" value={stats.total_documents} accent="rust" />
        <StatCard icon={Tags} label="Detected categories" value={stats.total_categories} accent="gold" />
        <StatCard icon={Languages} label="Languages" value={stats.total_languages} accent="teal" />
        <StatCard icon={BookMarked} label="Reading hours" value={stats.total_reading_hours} accent="slate" />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ChartCard
          title="Document types across the library"
          subtitle="See where the collection leans: education, health, legal, tech, and more."
        >
          <HorizontalBarChart data={stats.documents_by_category} dataKey="value" color="#d14e3f" />
        </ChartCard>

        <ChartCard
          title="Documents by language"
          subtitle="Useful for spotting bilingual collections and translation needs."
        >
          <DonutChart data={stats.documents_by_language} />
        </ChartCard>

        <ChartCard
          title="Formats in use"
          subtitle="PDF, DOCX, and image-heavy content at a glance."
        >
          <BarMixChart data={stats.documents_by_format} />
        </ChartCard>

        <ChartCard
          title="Reading depth"
          subtitle="A quick split between quick reads, focused reads, and deep dives."
        >
          <ReadingBandsChart data={stats.reading_time_bands} />
        </ChartCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <ChartCard
          title="Upload momentum"
          subtitle="A lighter timeline view kept only to help users spot recent indexing activity."
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stats.uploads_by_date}>
              <defs>
                <linearGradient id="uploadArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#d14e3f" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#d14e3f" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#eaded6" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: '#7b6f67', fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#7b6f67', fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#d14e3f" fill="url(#uploadArea)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="What stands out"
          subtitle="Plain-language highlights for normal users."
        >
          <div className="space-y-3">
            {stats.library_highlights.map((highlight) => (
              <div
                key={highlight}
                className="rounded-[22px] border border-[#f1e5dd] bg-[#fffaf7] px-4 py-3 text-sm leading-6 text-slate-700"
              >
                {highlight}
              </div>
            ))}
          </div>
        </ChartCard>
      </section>

      <section className="rounded-[34px] border border-white/60 bg-white/90 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.09)]">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d14e3f]">Document Briefs</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Recent files with human-friendly summaries</h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {stats.document_spotlights.map((document) => (
            <button
              key={document.doc_id}
              type="button"
              onClick={() => onOpenDocument({ id: document.doc_id, filename: document.filename })}
              className="rounded-[28px] border border-[#efe6df] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,241,0.96))] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(209,78,63,0.10)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <MetaChip>{document.category}</MetaChip>
                <MetaChip>{document.language}</MetaChip>
                <MetaChip>{document.file_type}</MetaChip>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-950">{document.filename}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{document.summary}</p>
              <div className="mt-4 flex items-center gap-3 text-xs font-medium text-slate-500">
                <span>{document.total_pages} pages</span>
                <span>{document.reading_minutes} min read</span>
                <span>{formatDate(document.uploaded_at)}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, accent }) {
  const accents = {
    rust: 'bg-[#fff1ea] text-[#d14e3f]',
    gold: 'bg-[#fff7dd] text-[#c58a10]',
    teal: 'bg-[#e7faf7] text-[#0f766e]',
    slate: 'bg-[#eef2ff] text-[#334155]',
  }

  return (
    <article className="rounded-[30px] border border-white/60 bg-white/92 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${accents[accent]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </article>
  )
}

function ChartCard({ title, subtitle, children }) {
  return (
    <article className="rounded-[30px] border border-white/60 bg-white/92 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
      <p className="text-lg font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </article>
  )
}

function HorizontalBarChart({ data, dataKey, color }) {
  if (data.length === 0) {
    return <EmptyChartState />
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 18 }}>
        <CartesianGrid stroke="#eaded6" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fill: '#7b6f67', fontSize: 12 }} />
        <YAxis dataKey="label" type="category" width={120} tick={{ fill: '#7b6f67', fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey={dataKey} fill={color} radius={[0, 10, 10, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function DonutChart({ data }) {
  if (data.length === 0) {
    return <EmptyChartState />
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius={68}
          outerRadius={105}
          paddingAngle={4}
        >
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}

function BarMixChart({ data }) {
  if (data.length === 0) {
    return <EmptyChartState />
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid stroke="#eaded6" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#7b6f67', fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fill: '#7b6f67', fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" radius={[10, 10, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function ReadingBandsChart({ data }) {
  if (data.length === 0) {
    return <EmptyChartState />
  }

  const prepared = data.map((entry, index) => ({
    ...entry,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadialBarChart innerRadius="20%" outerRadius="90%" data={prepared} startAngle={180} endAngle={0}>
        <Tooltip />
        <RadialBar background clockWise dataKey="value" cornerRadius={16} />
      </RadialBarChart>
    </ResponsiveContainer>
  )
}

function MetaChip({ children }) {
  return (
    <span className="rounded-full bg-[#f7ede7] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a04d36]">
      {children}
    </span>
  )
}

function EmptyChartState() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-[#eaded6] bg-[#fffaf7] text-sm text-slate-500">
      Upload more documents to populate this view.
    </div>
  )
}

function LoadingDashboard() {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-[34px] border border-white/60 bg-white/88">
      <div className="flex items-center gap-3 text-slate-500">
        <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
        Loading dashboard
      </div>
    </div>
  )
}

function EmptyDashboard() {
  return (
    <div className="rounded-[34px] border border-dashed border-[#eaded6] bg-white/88 p-10 text-center text-slate-500">
      Dashboard data will appear after documents are indexed.
    </div>
  )
}

function formatShortDate(value) {
  return value.slice(5)
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

Dashboard.propTypes = {
  documents: PropTypes.array.isRequired,
  onOpenDocument: PropTypes.func.isRequired,
  onToast: PropTypes.func.isRequired,
}

StatCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  accent: PropTypes.oneOf(['rust', 'gold', 'teal', 'slate']).isRequired,
}

ChartCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
}

HorizontalBarChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, value: PropTypes.number })).isRequired,
  dataKey: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
}

DonutChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, value: PropTypes.number })).isRequired,
}

BarMixChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, value: PropTypes.number })).isRequired,
}

ReadingBandsChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, value: PropTypes.number })).isRequired,
}

MetaChip.propTypes = {
  children: PropTypes.node.isRequired,
}

export default Dashboard
