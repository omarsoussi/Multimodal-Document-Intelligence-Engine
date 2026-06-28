import { BarChart2, Clock3, Files, Layers3, Trash2 } from 'lucide-react'
import PropTypes from 'prop-types'

function DocumentList({ documents, activeDocId, onSelect, onDelete, onStats }) {
  const selectedAll = activeDocId === null

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-[30px] border border-white/60 bg-white/90 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d14e3f]">Library</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">Indexed documents</h2>
        <p className="mt-1 text-sm text-slate-500">Choose a scope for chat or open the summary drawer.</p>
      </div>

      <div className="border-b border-[#efe3db] pb-4">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left text-sm font-semibold ${
            selectedAll
              ? 'bg-[#111827] text-white'
              : 'bg-[#fff8f4] text-slate-700 hover:bg-[#fff1ea]'
          }`}
        >
          <Files className="h-4 w-4" aria-hidden="true" />
          All documents
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-4">
        {documents.length === 0 && (
          <p className="rounded-[22px] border border-dashed border-[#ead8ce] bg-[#fffaf7] p-4 text-sm text-slate-500">
            No indexed documents yet.
          </p>
        )}
        <div className="space-y-3">
          {documents.map((document) => (
            <article
              key={document.id}
              className={`rounded-[26px] border p-4 transition ${
                activeDocId === document.id
                  ? 'border-[#efb7a7] bg-[#fff1ea] shadow-[0_10px_25px_rgba(209,78,63,0.10)]'
                  : 'border-[#efe3db] bg-white hover:border-[#e2cfc4]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onSelect(document.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#f7ede7] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a04d36]">
                      {document.category || 'General'}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {document.language || 'Unknown'}
                    </span>
                  </div>
                  <h3 className="mt-3 truncate text-sm font-semibold text-slate-900">{document.filename}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{document.summary || 'Short summary unavailable.'}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {document.page_count} pages
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {document.reading_minutes} min
                    </span>
                    <span>{document.file_type?.toUpperCase()}</span>
                  </div>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onStats(document.id)}
                    className="rounded-full p-2 text-slate-400 transition hover:bg-[#fff1ea] hover:text-[#d14e3f]"
                    aria-label={`View summary for ${document.filename}`}
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

DocumentList.propTypes = {
  documents: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      filename: PropTypes.string.isRequired,
      chunk_count: PropTypes.number.isRequired,
      uploaded_at: PropTypes.string.isRequired,
      file_type: PropTypes.string,
      page_count: PropTypes.number,
      language: PropTypes.string,
      category: PropTypes.string,
      reading_minutes: PropTypes.number,
      summary: PropTypes.string,
    })
  ).isRequired,
  activeDocId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onStats: PropTypes.func.isRequired,
}

export default DocumentList
