import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FileText,
  LoaderCircle,
  MessageSquareText,
  SendHorizontal,
  Sparkles,
} from 'lucide-react'
import PropTypes from 'prop-types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { sendMessage } from '../api/client'

const SUGGESTIONS = [
  'Summarize this document for a normal reader',
  'What are the main risks, deadlines, or action items?',
  'Create a short table of key facts from this file',
]

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

  const submitQuestion = async (nextQuestion = question) => {
    const trimmed = nextQuestion.trim()
    if (!trimmed || loading || !activeConversation) {
      return
    }
    setQuestion('')
    setLoading(true)
    try {
      const result = await sendMessage(activeConversation.id, trimmed, 4)
      onMessageSent(result.conversation)
    } catch (error) {
      onToast(error.response?.data?.detail || 'Query failed', 'error')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-5rem)] flex-1 flex-col overflow-hidden rounded-[38px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(252,247,242,0.95))] shadow-[0_34px_90px_rgba(15,23,42,0.10)]">
      <header className="border-b border-[#efe3db] px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d14e3f]">
              {activeConversation?.doc_filename || 'All Documents'}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Ask for answers, summaries, or tables
            </h1>
          </div>
          <div className="rounded-full border border-[#ead8ce] bg-white px-4 py-2 text-xs font-medium text-slate-500">
            Faster markdown answers with source-backed formatting
          </div>
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {!activeConversation && <WelcomeState />}
          {activeConversation && messages.length === 0 && (
            <ConversationIntro docFilename={activeConversation.doc_filename} onSuggestionClick={submitQuestion} />
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
          {loading && <ThinkingCard />}
          <div ref={bottomRef} />
        </div>
      </section>

      <div className="border-t border-[#efe3db] bg-white/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto max-w-4xl">
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => submitQuestion(item)}
                disabled={!activeConversation || loading}
                className="rounded-full border border-[#ead8ce] bg-[#fff8f4] px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-[#d14e3f] hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submitQuestion()
                }
              }}
              placeholder="Ask for a summary, comparison, table, action list, or explanation..."
              disabled={!activeConversation || loading}
              rows={2}
              className="min-h-[84px] min-w-0 flex-1 resize-none rounded-[24px] border border-[#ead8ce] bg-[#fffdfb] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#d14e3f]"
            />
            <button
              type="submit"
              onClick={() => submitQuestion()}
              disabled={!activeConversation || loading}
              className="inline-flex min-w-[124px] items-center justify-center gap-2 self-end rounded-[24px] bg-[#111827] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <SendHorizontal className="h-4 w-4" aria-hidden="true" />
              Send
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

function WelcomeState() {
  return (
    <div className="flex min-h-[460px] flex-col items-center justify-center rounded-[34px] bg-[radial-gradient(circle_at_top,rgba(255,226,211,0.72),rgba(255,255,255,0.95)_40%),linear-gradient(135deg,rgba(209,78,63,0.08),rgba(15,118,110,0.08),rgba(255,255,255,0.95))] px-6 text-center">
      <div className="rounded-[30px] border border-white/70 bg-white/92 px-6 py-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff1ea] text-[#d14e3f]">
          <FileText className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          Pick a document and start a better conversation
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">
          The assistant can answer questions, build tables, summarize documents, and show source-backed evidence from your indexed files.
        </p>
      </div>
    </div>
  )
}

function ConversationIntro({ docFilename, onSuggestionClick }) {
  return (
    <div className="rounded-[30px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,241,234,0.8),rgba(255,255,255,0.98))] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-white p-3 text-[#d14e3f] shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <MessageSquareText className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {docFilename ? `New chat for ${docFilename}` : 'New chat across all documents'}
          </p>
          <p className="text-sm text-slate-500">
            Start with one of these prompts to get a clean summary-first answer.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onSuggestionClick(item)}
            className="rounded-full border border-[#ead8ce] bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-[#d14e3f] hover:text-slate-950"
          >
            {item}
          </button>
        ))}
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
          className={`overflow-hidden rounded-[28px] px-5 py-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)] ${
            isUser
              ? 'bg-[#111827] text-white'
              : 'border border-white/80 bg-white/96 text-slate-700'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
          ) : (
            <div className="rich-answer">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && message.citations.length > 0 && (
          <div className="w-full rounded-[24px] border border-[#efe3db] bg-[#fffaf7] px-4 py-3">
            <button
              type="button"
              onClick={() => onToggleSources((current) => ({ ...current, [messageKey]: !isOpen }))}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-800"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              )}
              Sources ({message.citations.length})
            </button>
            {isOpen && (
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {message.citations.map((citation, index) => (
                  <li
                    key={`${messageKey}-source-${index}`}
                    className="rounded-2xl border border-[#ead8ce] bg-white px-3 py-3"
                  >
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      <FileText className="h-4 w-4 text-[#d14e3f]" aria-hidden="true" />
                      <span>
                        {citation.source_filename} - p. {citation.page_number}
                      </span>
                    </div>
                    <p className="mt-2 max-h-[4.8rem] overflow-hidden text-xs leading-6 text-slate-500">
                      {citation.chunk_text}
                    </p>
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

function ThinkingCard() {
  return (
    <div className="flex justify-start">
      <div className="inline-flex items-center gap-3 rounded-[24px] border border-white/80 bg-white/96 px-4 py-3 text-sm text-slate-500 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>Building a cleaner answer...</span>
        <Sparkles className="h-4 w-4 text-[#d14e3f]" aria-hidden="true" />
      </div>
    </div>
  )
}

const citationShape = PropTypes.shape({
  page_number: PropTypes.number.isRequired,
  chunk_index: PropTypes.number.isRequired,
  chunk_text: PropTypes.string.isRequired,
  score: PropTypes.number.isRequired,
  source_filename: PropTypes.string.isRequired,
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
  onToast: PropTypes.func.isRequired,
}

ConversationIntro.propTypes = {
  docFilename: PropTypes.string,
  onSuggestionClick: PropTypes.func.isRequired,
}

export default ChatWindow
