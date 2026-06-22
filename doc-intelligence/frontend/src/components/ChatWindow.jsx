import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FileText,
  LoaderCircle,
  MessageSquareText,
  SendHorizontal,
} from 'lucide-react'
import PropTypes from 'prop-types'

import { sendMessage } from '../api/client'

function ChatWindow({ activeConversation, onMessageSent, onToast }) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [openSources, setOpenSources] = useState({})
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const messages = activeConversation?.messages || []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const submitQuestion = async () => {
    const trimmed = question.trim()
    if (!trimmed || loading || !activeConversation) {
      return
    }
    setQuestion('')
    setLoading(true)
    try {
      const result = await sendMessage(activeConversation.id, trimmed, 5)
      onMessageSent(result.conversation)
    } catch (error) {
      onToast(error.response?.data?.detail || 'Query failed', 'error')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-5rem)] flex-1 flex-col overflow-hidden rounded-[36px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.92))] shadow-[0_30px_90px_rgba(15,23,42,0.10)]">
      <header className="border-b border-slate-100 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
          {activeConversation?.doc_filename || 'All Documents'}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          Chat with documents
        </h1>
      </header>
      <section className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {!activeConversation && <WelcomeState />}
          {activeConversation && messages.length === 0 && (
            <ConversationIntro docFilename={activeConversation.doc_filename} />
          )}
          {messages.map((message, index) => (
            <MessageBubble
              key={`${message.created_at}-${index}`}
              message={message}
              messageKey={`${message.created_at}-${index}`}
              openSources={openSources}
              onToggleSources={setOpenSources}
            />
          ))}
          {loading && <ThinkingDots />}
          <div ref={bottomRef} />
        </div>
      </section>
      <div className="border-t border-slate-100 bg-white/85 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl gap-3">
          <input
            ref={inputRef}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                submitQuestion()
              }
            }}
            placeholder="Ask about the contract, invoice, or report..."
            disabled={!activeConversation || loading}
            className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-emerald-400 focus:bg-white"
          />
          <button
            type="submit"
            onClick={submitQuestion}
            disabled={!activeConversation || loading}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <SendHorizontal className="h-4 w-4" aria-hidden="true" />
            Send
          </button>
        </div>
      </div>
    </main>
  )
}

function WelcomeState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[32px] bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.22),rgba(255,255,255,0.92)_42%),linear-gradient(135deg,rgba(16,185,129,0.06),rgba(59,130,246,0.08),rgba(255,255,255,0.92))] px-6 text-center">
      <div className="rounded-[28px] border border-white/80 bg-white/92 px-6 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
          <FileText className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          Select a document or start a new chat
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
          Upload a file, open the dashboard, or pick a conversation from the left rail to continue where you left off.
        </p>
      </div>
    </div>
  )
}

function ConversationIntro({ docFilename }) {
  return (
    <div className="rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,rgba(219,234,254,0.35),rgba(255,255,255,0.98))] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-white p-3 text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <MessageSquareText className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {docFilename ? `New chat for ${docFilename}` : 'New chat across all documents'}
          </p>
          <p className="text-sm text-slate-500">
            Ask the first question to build your saved conversation history.
          </p>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message, messageKey, openSources, onToggleSources }) {
  const isUser = message.role === 'user'
  const isOpen = Boolean(openSources[messageKey])
  return (
    <article className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-3`}>
        <div
          className={`rounded-[26px] px-4 py-3 text-sm leading-6 shadow-[0_14px_30px_rgba(15,23,42,0.05)] ${
            isUser
              ? 'bg-slate-900 text-white'
              : 'border border-white/80 bg-white/95 text-slate-700'
          }`}
        >
          {message.content}
        </div>
        {!isUser && message.citations.length > 0 && (
          <div className="w-full">
            <button
              type="button"
              onClick={() => onToggleSources((current) => ({ ...current, [messageKey]: !isOpen }))}
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 transition hover:text-slate-800"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              )}
              View sources ({message.citations.length})
            </button>
            {isOpen && (
              <ul className="mt-2 space-y-1 text-sm text-slate-500">
                {message.citations.map((citation, index) => (
                  <li key={`${messageKey}-source-${index}`} className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <span>
                      {citation.source_filename} - p. {citation.page_number}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

function ThinkingDots() {
  return (
    <div className="flex justify-start">
      <div className="inline-flex items-center gap-2 rounded-2xl border border-white/80 bg-white/95 px-4 py-3 text-sm text-slate-500 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        Thinking
      </div>
    </div>
  )
}

const citationShape = PropTypes.shape({
  page_number: PropTypes.number.isRequired,
  chunk_index: PropTypes.number.isRequired,
  chunk_text: PropTypes.string.isRequired,
  score: PropTypes.number.isRequired,
  source_filename: PropTypes.string.isRequired
})

MessageBubble.propTypes = {
  message: PropTypes.shape({
    role: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    created_at: PropTypes.string.isRequired,
    citations: PropTypes.arrayOf(citationShape),
  }).isRequired,
  messageKey: PropTypes.string.isRequired,
  openSources: PropTypes.objectOf(PropTypes.bool).isRequired,
  onToggleSources: PropTypes.func.isRequired,
}

ChatWindow.propTypes = {
  activeConversation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    doc_filename: PropTypes.string,
    messages: PropTypes.arrayOf(
      PropTypes.shape({
        role: PropTypes.string.isRequired,
        content: PropTypes.string.isRequired,
        created_at: PropTypes.string.isRequired,
        citations: PropTypes.arrayOf(citationShape),
      })
    ).isRequired,
  }),
  onMessageSent: PropTypes.func.isRequired,
  onToast: PropTypes.func.isRequired
}

ConversationIntro.propTypes = {
  docFilename: PropTypes.string,
}

export default ChatWindow
