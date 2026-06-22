import { BarChart2, Clock3, Files, Layers3, Trash2 } from 'lucide-react'
import PropTypes from 'prop-types'

function DocumentList({ documents, activeDocId, onSelect, onDelete, onStats }) {
  const selectedAll = activeDocId === null

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-[28px] border border-white/70 bg-white/92 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-900">Document library</p>
        <p className="text-xs text-slate-500">Choose a scope for a new conversation or inspect document stats.</p>
      </div>
      <div className="border-b border-slate-100 pb-4">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold ${
            selectedAll ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Files className="h-4 w-4" aria-hidden="true" />
          All documents
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pt-4">
        {documents.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
            No indexed documents yet.
          </p>
        )}
        <div className="space-y-3">
          {documents.map((document) => (
            <article
              key={document.id}
              className={`rounded-[24px] border p-4 transition ${
                activeDocId === document.id
                  ? 'border-emerald-200 bg-emerald-50/80 shadow-[0_10px_25px_rgba(16,185,129,0.10)]'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelect(document.id)}
                  className="min-w-0 text-left"
                >
                  <h3 className="truncate text-sm font-semibold text-slate-900">{document.filename}</h3>
                  <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                    <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
                    {document.chunk_count} chunks
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDate(document.uploaded_at)}
                  </p>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onStats(document.id)}
                    className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={`View stats for ${document.filename}`}
                  >
                    <BarChart2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(document, onDelete)}
                    className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${document.filename}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function confirmDelete(document, onDelete) {
  if (window.confirm(`Delete ${document.filename}?`)) {
    onDelete(document.id)
  }
}

function formatDate(value) {
  if (!value) {
    return 'Unknown time'
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

DocumentList.propTypes = {
  documents: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      filename: PropTypes.string.isRequired,
      chunk_count: PropTypes.number.isRequired,
      uploaded_at: PropTypes.string.isRequired
    })
  ).isRequired,
  activeDocId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onStats: PropTypes.func.isRequired
}

export default DocumentList
