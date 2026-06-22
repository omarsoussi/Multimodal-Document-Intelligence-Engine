import { Clock3, Files, Layers3, Trash2 } from 'lucide-react'
import PropTypes from 'prop-types'

function DocumentList({ documents, activeDocId, onSelect, onDelete }) {
  const selectedAll = activeDocId === null

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold ${
            selectedAll ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Files className="h-4 w-4" aria-hidden="true" />
          All Documents
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {documents.length === 0 && (
          <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No indexed documents yet.
          </p>
        )}
        <div className="space-y-3">
          {documents.map((document) => (
            <article
              key={document.id}
              className={`rounded-lg border p-3 ${
                activeDocId === document.id
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 bg-white'
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
                <button
                  type="button"
                  onClick={() => confirmDelete(document, onDelete)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Delete ${document.filename}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
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
  onDelete: PropTypes.func.isRequired
}

export default DocumentList
