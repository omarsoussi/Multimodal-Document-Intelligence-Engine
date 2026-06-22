import { useEffect, useRef, useState } from 'react'
import { SendHorizontal } from 'lucide-react'
import PropTypes from 'prop-types'

import { queryDocuments } from '../api/client'
import CitationCard from './CitationCard'

function ChatWindow({ activeDocument, onToast }) {
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const submitQuestion = async (event) => {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || loading) {
      return
    }
    setQuestion('')
    setMessages((current) => [...current, userMessage(trimmed)])
    setLoading(true)
    try {
      const result = await queryDocuments(trimmed, activeDocument?.id || null, 5)
      setMessages((current) => [...current, assistantMessage(result)])
    } catch (error) {
      onToast(error.response?.data?.detail || 'Query failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          {activeDocument ? activeDocument.filename : 'All Documents'}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-950">Document analyst</h1>
      </header>
      <section className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {messages.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <p className="text-sm leading-6 text-slate-600">
                Ask a question after uploading a document. Answers will include source citations.
              </p>
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {loading && <ThinkingDots />}
          <div ref={bottomRef} />
        </div>
      </section>
      <form onSubmit={submitQuestion} className="border-t border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl gap-3">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about the contract, invoice, or report..."
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            <SendHorizontal className="h-4 w-4" aria-hidden="true" />
            Send
          </button>
        </div>
      </form>
    </main>
  )
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <article className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-3`}>
        <div
          className={`rounded-lg px-4 py-3 text-sm leading-6 ${
            isUser ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'
          }`}
        >
          {message.content}
        </div>
        {!isUser && message.citations.length > 0 && (
          <div className="w-full space-y-2">
            {message.citations.map((citation) => (
              <CitationCard key={`${message.id}-${citation.chunk_index}`} citation={citation} />
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

function ThinkingDots() {
  return (
    <div className="flex justify-start">
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
        <span className="inline-flex gap-1">
          <span className="animate-pulse">thinking</span>
          <span className="animate-bounce">.</span>
          <span className="animate-bounce delay-150">.</span>
          <span className="animate-bounce delay-300">.</span>
        </span>
      </div>
    </div>
  )
}

function userMessage(content) {
  return { id: crypto.randomUUID(), role: 'user', content, citations: [] }
}

function assistantMessage(result) {
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: result.answer,
    citations: result.citations
  }
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
    id: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    citations: PropTypes.arrayOf(citationShape).isRequired
  }).isRequired
}

ChatWindow.propTypes = {
  activeDocument: PropTypes.shape({
    id: PropTypes.string.isRequired,
    filename: PropTypes.string.isRequired
  }),
  onToast: PropTypes.func.isRequired
}

export default ChatWindow
