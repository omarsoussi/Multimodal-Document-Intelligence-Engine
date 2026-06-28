import { startTransition, useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Menu,
  MessageSquare,
  PanelRightOpen,
  X,
} from 'lucide-react'
import PropTypes from 'prop-types'

import {
  createConversation,
  deleteConversation,
  deleteDocument,
  getConversation,
  listConversations,
  listDocuments,
} from './api/client'
import ChatWindow from './components/ChatWindow'
import ConversationList from './components/ConversationList'
import Dashboard from './components/Dashboard'
import DocumentList from './components/DocumentList'
import DocumentStatsPanel from './components/DocumentStatsPanel'
import UploadZone from './components/UploadZone'
import UtilityWorkbench from './components/UtilityWorkbench'

function App() {
  const [documents, setDocuments] = useState([])
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [activeConversation, setActiveConversation] = useState(null)
  const [activeView, setActiveView] = useState('chat')
  const [statsDocument, setStatsDocument] = useState(null)
  const [mobilePanel, setMobilePanel] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    refreshDocuments()
    refreshConversations()
  }, [])

  const showToast = (message, type) => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3500)
  }

  const handleDelete = async (docId) => {
    try {
      await deleteDocument(docId)
      if (activeConversation?.doc_id === docId) {
        setActiveConversation(null)
        setActiveConversationId(null)
      }
      await refreshDocuments()
      showToast('Document deleted', 'success')
    } catch (error) {
      showToast(error.response?.data?.detail || 'Delete failed', 'error')
    }
  }

  const handleUploaded = async (document) => {
    await refreshDocuments()
    await handleCreateConversation(document.id, document.filename)
    showToast('Document ready', 'success')
  }

  const refreshDocuments = async () => {
    try {
      const items = await listDocuments()
      startTransition(() => setDocuments(items))
    } catch (error) {
      showToast(error.response?.data?.detail || 'Could not load documents', 'error')
    }
  }

  const refreshConversations = async () => {
    try {
      const items = await listConversations()
      startTransition(() => setConversations(items))
    } catch (error) {
      showToast(error.response?.data?.detail || 'Could not load conversations', 'error')
    }
  }

  const handleCreateConversation = async (docId = null, docFilename = null) => {
    try {
      const conversation = await createConversation(docId, docFilename)
      startTransition(() => {
        setActiveConversationId(conversation.id)
        setActiveConversation(conversation)
        setActiveView('chat')
        setMobilePanel(null)
      })
      await refreshConversations()
    } catch (error) {
      showToast(error.response?.data?.detail || 'Could not create conversation', 'error')
    }
  }

  const handleSelectConversation = async (conversationId) => {
    try {
      const conversation = await getConversation(conversationId)
      startTransition(() => {
        setActiveConversationId(conversationId)
        setActiveConversation(conversation)
        setActiveView('chat')
        setMobilePanel(null)
      })
    } catch (error) {
      showToast(error.response?.data?.detail || 'Could not open conversation', 'error')
    }
  }

  const handleDeleteConversation = async (conversationId) => {
    try {
      await deleteConversation(conversationId)
      if (activeConversationId === conversationId) {
        setActiveConversationId(null)
        setActiveConversation(null)
      }
      await refreshConversations()
      showToast('Conversation deleted', 'success')
    } catch (error) {
      showToast(error.response?.data?.detail || 'Could not delete conversation', 'error')
    }
  }

  const handleMessageSent = async (conversation) => {
    startTransition(() => {
      setActiveConversation(conversation)
      setActiveConversationId(conversation.id)
    })
    await refreshConversations()
  }

  const handleDocumentSelect = async (docId) => {
    if (docId === null) {
      await handleCreateConversation(null, null)
      return
    }
    const document = documents.find((item) => item.id === docId)
    if (document) {
      await handleCreateConversation(document.id, document.filename)
    }
  }

  const handleOpenDocumentStats = (docOrId) => {
    const document =
      typeof docOrId === 'string'
        ? documents.find((item) => item.id === docOrId)
        : docOrId
    if (document) {
      setStatsDocument(document)
    }
  }

  const activeDocId = activeConversation?.doc_id || null

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,220,200,0.7),rgba(248,242,236,0.96)_34%),radial-gradient(circle_at_top_right,rgba(198,237,232,0.52),transparent_30%),linear-gradient(180deg,#f4ede7,#f7f1eb)] px-3 py-3 text-slate-950 md:px-5 md:py-5">
      <div className="mx-auto flex max-w-[1720px] flex-col gap-4 lg:grid lg:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[300px_minmax(0,1fr)_360px]">
        <aside className="hidden lg:min-h-0 lg:min-w-0 lg:flex">
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelect={handleSelectConversation}
            onDelete={handleDeleteConversation}
            onNew={() => handleCreateConversation(activeConversation?.doc_id || null, activeConversation?.doc_filename || null)}
          />
        </aside>

        <section className="flex min-w-0 flex-col gap-4">
          <header className="rounded-[34px] border border-white/60 bg-white/84 px-5 py-4 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobilePanel(mobilePanel === 'conversations' ? null : 'conversations')}
                  className="rounded-2xl border border-[#ead8ce] p-2 text-slate-600 transition hover:bg-[#fff8f4] lg:hidden"
                  aria-label="Open conversations"
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </button>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d14e3f]">Multimodal Document Intelligence</p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">A cleaner workspace for chat, summaries, and PDF tools</h1>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-[#ead8ce] bg-[#fff8f4] p-1">
                <TabButton
                  active={activeView === 'chat'}
                  icon={MessageSquare}
                  label="Chat"
                  onClick={() => setActiveView('chat')}
                />
                <TabButton
                  active={activeView === 'dashboard'}
                  icon={LayoutDashboard}
                  label="Dashboard"
                  onClick={() => setActiveView('dashboard')}
                />
              </div>

              <button
                type="button"
                onClick={() => setMobilePanel(mobilePanel === 'documents' ? null : 'documents')}
                className="rounded-2xl border border-[#ead8ce] p-2 text-slate-600 transition hover:bg-[#fff8f4] lg:hidden"
                aria-label="Open documents"
              >
                <PanelRightOpen className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </header>

          {activeView === 'chat' ? (
            <ChatWindow
              activeConversation={activeConversation}
              onMessageSent={handleMessageSent}
              onToast={showToast}
            />
          ) : (
            <Dashboard
              documents={documents}
              onOpenDocument={handleOpenDocumentStats}
              onToast={showToast}
            />
          )}
        </section>

        <aside className="hidden min-h-0 flex-col gap-4 lg:flex lg:min-w-0">
          <UploadZone onUploaded={handleUploaded} onToast={showToast} />
          <UtilityWorkbench onToast={showToast} />
          <DocumentList
            documents={documents}
            activeDocId={activeDocId}
            onSelect={handleDocumentSelect}
            onDelete={handleDelete}
            onStats={handleOpenDocumentStats}
          />
        </aside>
      </div>

      {mobilePanel === 'conversations' && (
        <MobileSheet title="Conversations" onClose={() => setMobilePanel(null)}>
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelect={handleSelectConversation}
            onDelete={handleDeleteConversation}
            onNew={() => handleCreateConversation(activeConversation?.doc_id || null, activeConversation?.doc_filename || null)}
          />
        </MobileSheet>
      )}

      {mobilePanel === 'documents' && (
        <MobileSheet title="Documents & Tools" onClose={() => setMobilePanel(null)}>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
            <UploadZone onUploaded={handleUploaded} onToast={showToast} />
            <UtilityWorkbench onToast={showToast} />
            <DocumentList
              documents={documents}
              activeDocId={activeDocId}
              onSelect={handleDocumentSelect}
              onDelete={handleDelete}
              onStats={handleOpenDocumentStats}
            />
          </div>
        </MobileSheet>
      )}

      {statsDocument && (
        <DocumentStatsPanel
          docId={statsDocument.id}
          filename={statsDocument.filename}
          onClose={() => setStatsDocument(null)}
          onToast={showToast}
        />
      )}

      {toast && (
        <div
          role="status"
          className={`fixed right-5 top-5 z-[60] rounded-2xl px-4 py-3 text-sm font-semibold shadow-[0_20px_50px_rgba(15,23,42,0.18)] ${
            toast.type === 'success' ? 'bg-[#0f766e] text-white' : 'bg-[#b91c1c] text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  )
}

function MobileSheet({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/30 lg:hidden">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close panel" />
      <div className="absolute left-0 top-0 h-full w-full max-w-sm bg-[#fcf7f2] p-4 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#ead8ce] p-2 text-slate-500 transition hover:bg-[#fff8f4] hover:text-slate-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex h-[calc(100%-3.5rem)] min-h-0 flex-col">{children}</div>
      </div>
    </div>
  )
}

TabButton.propTypes = {
  active: PropTypes.bool.isRequired,
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
}

MobileSheet.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default App
