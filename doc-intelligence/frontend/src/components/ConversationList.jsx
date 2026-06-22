import { format, isToday, isYesterday } from 'date-fns'
import { MessageSquareMore, PlusCircle, Trash2 } from 'lucide-react'
import PropTypes from 'prop-types'

function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
  onDelete,
  onNew,
}) {
  const groups = groupConversations(conversations)

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-[28px] border border-white/70 bg-white/88 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
      <button
        type="button"
        onClick={onNew}
        className="mb-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        <PlusCircle className="h-4 w-4" aria-hidden="true" />
        New Chat
      </button>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        {conversations.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
            No conversations yet. Ask your first question.
          </div>
        )}
        {groups.map((group) => (
          <section key={group.label}>
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {group.label}
            </p>
            <div className="space-y-2">
              {group.items.map((conversation) => (
                <article
                  key={conversation.id}
                  className={`group rounded-2xl border px-3 py-3 transition ${
                    activeConversationId === conversation.id
                      ? 'border-emerald-200 bg-emerald-50/80 shadow-[0_10px_25px_rgba(16,185,129,0.10)]'
                      : 'border-transparent bg-slate-50/85 hover:border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onSelect(conversation.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquareMore className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {conversation.title}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
                          {conversation.doc_filename || 'All documents'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatDate(conversation.updated_at)}
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDelete(conversation, onDelete)}
                      className="rounded-full p-2 text-slate-400 opacity-100 transition hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100"
                      aria-label={`Delete ${conversation.title}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}

function groupConversations(conversations) {
  const buckets = { Today: [], Yesterday: [], Earlier: [] }
  for (const conversation of conversations) {
    const updatedAt = new Date(conversation.updated_at)
    if (isToday(updatedAt)) {
      buckets.Today.push(conversation)
    } else if (isYesterday(updatedAt)) {
      buckets.Yesterday.push(conversation)
    } else {
      buckets.Earlier.push(conversation)
    }
  }
  return Object.entries(buckets)
    .map(([label, items]) => ({ label, items }))
    .filter((group) => group.items.length > 0)
}

function confirmDelete(conversation, onDelete) {
  if (window.confirm(`Delete conversation "${conversation.title}"?`)) {
    onDelete(conversation.id)
  }
}

function formatDate(value) {
  return format(new Date(value), 'MMM d, p')
}

ConversationList.propTypes = {
  conversations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      doc_filename: PropTypes.string,
      updated_at: PropTypes.string.isRequired,
    })
  ).isRequired,
  activeConversationId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onNew: PropTypes.func.isRequired,
}

export default ConversationList
