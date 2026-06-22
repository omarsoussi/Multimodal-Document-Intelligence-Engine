import { ChevronDown, ChevronRight } from 'lucide-react'
import PropTypes from 'prop-types'
import { useState } from 'react'

function CitationCard({ citation }) {
  const [open, setOpen] = useState(false)
  const score = Math.max(0, Math.min(1, citation.score))

  return (
    <article className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-500" aria-hidden="true" />
          )}
          <span className="truncate text-sm font-semibold text-slate-900">
            Page {citation.page_number}, chunk {citation.chunk_index}
          </span>
        </span>
        <span className="text-xs font-medium text-slate-500">{Math.round(score * 100)}%</span>
      </button>
      <div className="px-4 pb-3">
        <div className="h-1.5 rounded-full bg-slate-100">
          <div className={`h-1.5 rounded-full ${scoreColor(score)} ${scoreWidth(score)}`} />
        </div>
        {open && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {citation.chunk_text}
          </p>
        )}
      </div>
    </article>
  )
}

function scoreColor(score) {
  if (score > 0.85) {
    return 'bg-emerald-500'
  }
  if (score >= 0.7) {
    return 'bg-amber-500'
  }
  return 'bg-red-500'
}

function scoreWidth(score) {
  if (score >= 0.95) return 'w-full'
  if (score >= 0.9) return 'w-11/12'
  if (score >= 0.8) return 'w-10/12'
  if (score >= 0.7) return 'w-9/12'
  if (score >= 0.6) return 'w-8/12'
  if (score >= 0.5) return 'w-7/12'
  return 'w-6/12'
}

CitationCard.propTypes = {
  citation: PropTypes.shape({
    page_number: PropTypes.number.isRequired,
    chunk_index: PropTypes.number.isRequired,
    chunk_text: PropTypes.string.isRequired,
    score: PropTypes.number.isRequired,
    source_filename: PropTypes.string.isRequired
  }).isRequired
}

export default CitationCard
