import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BrainCircuit, FileText, LoaderCircle, Sparkles, X } from 'lucide-react'
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
          onToast(error.response?.data?.detail || 'Could not load document brief', 'error')
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
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[4px]">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close document brief" />
      <aside className="absolute right-0 top-0 h-full w-full max-w-[760px] overflow-y-auto border-l border-white/20 bg-[#fcf7f2] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d14e3f]">Document Brief</p>
            <p className="mt-2 truncate text-2xl font-semibold text-slate-950">{filename}</p>
            <p className="mt-1 text-sm text-slate-500">Summary-first insights instead of chunk-heavy analytics.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#ead8ce] bg-white p-2 text-slate-500 transition hover:bg-[#fff6f1] hover:text-slate-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        {loading && <LoadingState />}
        {!loading && stats && (
          <div className="space-y-5">
            <section className="rounded-[30px] border border-[#eadfd7] bg-white px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              <div className="flex flex-wrap items-center gap-2">
                <MetaBadge>{stats.detected_category}</MetaBadge>
                <MetaBadge>{stats.detected_language}</MetaBadge>
                <MetaBadge>{stats.file_type.toUpperCase()}</MetaBadge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <SummaryPill label="Pages" value={stats.total_pages} />
                <SummaryPill label="Words" value={stats.estimated_word_count.toLocaleString()} />
                <SummaryPill label="Reading time" value={`${stats.reading_minutes} min`} />
              </div>
              <div className="mt-5 rounded-[24px] bg-[linear-gradient(135deg,rgba(255,241,234,0.95),rgba(255,255,255,0.98))] p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-3 text-[#d14e3f] shadow-[0_10px_30px_rgba(209,78,63,0.12)]">
                    <FileText className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Short summary</p>
                    <p className="text-xs text-slate-500">Built to give a useful overview in seconds.</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-700">{stats.summary}</p>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <PanelCard title="Key takeaways" icon={Sparkles}>
                <div className="space-y-3">
                  {stats.key_takeaways.map((item) => (
                    <div
                      key={item}
                      className="rounded-[22px] border border-[#f2e4dc] bg-[#fffaf7] px-4 py-3 text-sm leading-6 text-slate-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </PanelCard>

              <PanelCard title="Document signature" icon={BrainCircuit}>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={stats.radar_profile}>
                    <PolarGrid stroke="#ead8ce" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#7b6f67', fontSize: 12 }} />
                    <PolarRadiusAxis tick={false} axisLine={false} />
                    <Radar
                      dataKey="value"
                      stroke="#d14e3f"
                      fill="#d14e3f"
                      fillOpacity={0.18}
                      strokeWidth={2.5}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </PanelCard>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <PanelCard title="Mind map view" icon={BrainCircuit}>
                <DocumentMindMap graph={stats.mind_map} />
              </PanelCard>

              <PanelCard title="Core themes" icon={Sparkles}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.topic_breakdown} layout="vertical" margin={{ left: 18 }}>
                    <CartesianGrid stroke="#ead8ce" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: '#7b6f67', fontSize: 12 }} />
                    <YAxis dataKey="label" type="category" width={100} tick={{ fill: '#7b6f67', fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#d14e3f" radius={[0, 10, 10, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </PanelCard>
            </section>

            <PanelCard title="Top keywords" icon={Sparkles}>
              <div className="flex flex-wrap gap-2">
                {stats.top_keywords.map((item) => (
                  <span
                    key={item.word}
                    className="rounded-full border border-[#ead8ce] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600"
                  >
                    {item.word} <span className="text-[#d14e3f]">{item.count}</span>
                  </span>
                ))}
              </div>
            </PanelCard>
          </div>
        )}
      </aside>
    </div>
  )
}

function DocumentMindMap({ graph }) {
  if (!graph?.nodes?.length) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-[24px] border border-dashed border-[#ead8ce] bg-[#fffaf7] text-sm text-slate-500">
        A mind map will appear once the document has enough readable structure.
      </div>
    )
  }

  const root = graph.nodes.find((node) => node.group === 'root') || graph.nodes[0]
  const branches = graph.nodes.filter((node) => node.group === 'branch')
  const branchChildren = Object.fromEntries(branches.map((branch) => [branch.id, []]))

  graph.edges.forEach((edge) => {
    if (branchChildren[edge.source]) {
      branchChildren[edge.source].push(edge.target)
    }
  })

  const nodeLookup = Object.fromEntries(graph.nodes.map((node) => [node.id, node]))
  const positions = { [root.id]: { x: 210, y: 145 } }

  branches.forEach((branch, index) => {
    const angle = (-Math.PI / 2) + (index * ((Math.PI * 2) / Math.max(branches.length, 1)))
    positions[branch.id] = {
      x: 210 + Math.cos(angle) * 95,
      y: 145 + Math.sin(angle) * 82,
    }
    const leaves = branchChildren[branch.id] || []
    leaves.forEach((leafId, leafIndex) => {
      const offset = leaves.length === 1 ? 0 : (leafIndex - (leaves.length - 1) / 2) * 0.28
      positions[leafId] = {
        x: 210 + Math.cos(angle + offset) * 165,
        y: 145 + Math.sin(angle + offset) * 128,
      }
    })
  })

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#ead8ce] bg-[radial-gradient(circle_at_center,rgba(255,243,236,0.92),rgba(255,255,255,1)_56%)]">
      <svg viewBox="0 0 420 290" className="h-[290px] w-full">
        {graph.edges.map((edge) => {
          const start = positions[edge.source]
          const end = positions[edge.target]
          if (!start || !end) {
            return null
          }
          return (
            <line
              key={`${edge.source}-${edge.target}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="#dfc7ba"
              strokeWidth={edge.weight === 2 ? 2.5 : 1.6}
            />
          )
        })}

        {graph.nodes.map((node) => {
          const point = positions[node.id]
          if (!point) {
            return null
          }
          const radius = node.group === 'root' ? 34 : node.group === 'branch' ? 26 : 22
          const fill = node.group === 'root' ? '#d14e3f' : node.group === 'branch' ? '#fff1ea' : '#ffffff'
          const textColor = node.group === 'root' ? '#ffffff' : '#1e293b'
          return (
            <g key={node.id} transform={`translate(${point.x}, ${point.y})`}>
              <circle r={radius} fill={fill} stroke="#e7cfc3" strokeWidth="1.5" />
              <foreignObject x={-radius} y={-radius} width={radius * 2} height={radius * 2}>
                <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-semibold leading-tight">
                  <span style={{ color: textColor }}>{node.label}</span>
                </div>
              </foreignObject>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function MetaBadge({ children }) {
  return (
    <span className="rounded-full bg-[#f7ede7] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a04d36]">
      {children}
    </span>
  )
}

function SummaryPill({ label, value }) {
  return (
    <div className="rounded-[20px] border border-[#ead8ce] bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function PanelCard({ title, icon: Icon, children }) {
  return (
    <section className="rounded-[30px] border border-[#eadfd7] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-[#fff1ea] p-3 text-[#d14e3f]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <p className="text-lg font-semibold text-slate-950">{title}</p>
      </div>
      {children}
    </section>
  )
}

function LoadingState() {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-dashed border-[#ead8ce] bg-white text-slate-500">
      <div className="flex items-center gap-3">
        <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
        Loading document brief
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

DocumentMindMap.propTypes = {
  graph: PropTypes.shape({
    nodes: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        group: PropTypes.string.isRequired,
      })
    ).isRequired,
    edges: PropTypes.arrayOf(
      PropTypes.shape({
        source: PropTypes.string.isRequired,
        target: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
}

MetaBadge.propTypes = {
  children: PropTypes.node.isRequired,
}

SummaryPill.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
}

PanelCard.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  children: PropTypes.node.isRequired,
}

export default DocumentStatsPanel
