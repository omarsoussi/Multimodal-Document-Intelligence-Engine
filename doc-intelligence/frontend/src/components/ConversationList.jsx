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
    <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-[32px] border border-[#213041] bg-[linear-gradient(180deg,#152334,#0f172a)] p-4 text-white shadow-[0_34px_90px_rgba(15,23,42,0.24)]">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f8b08f]">Workspace</p>
        <h2 className="mt-2 text-xl font-semibold">Conversations</h2>
        <p className="mt-1 text-sm text-slate-300">Keep document chats organized by scope and recency.</p>
      </div>

      <button
        type="button"
        onClick={onNew}
        className="mb-4 inline-flex items-center justify-center gap-2 rounded-[22px] bg-[#d14e3f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#bd4335]"
      >
        <PlusCircle className="h-4 w-4" aria-hidden="true" />
        New Chat
      </button>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        {conversations.length === 0 && (
          <div className="rounded-[22px] border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-300">
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
                  className={`group rounded-[22px] border px-3 py-3 transition ${
                    activeConversationId === conversation.id
                      ? 'border-[#f1a17d] bg-white/12 shadow-[0_10px_25px_rgba(209,78,63,0.14)]'
                      : 'border-transparent bg-white/5 hover:border-white/10 hover:bg-white/8'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onSelect(conversation.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquareMore className="h-4 w-4 text-[#f8b08f]" aria-hidden="true" />
                        <p className="truncate text-sm font-semibold text-white">{conversation.title}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-medium text-slate-200">
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
                      className="rounded-full p-2 text-slate-400 opacity-100 transition hover:bg-red-500/10 hover:text-red-300 md:opacity-0 md:group-hover:opacity-100"
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
