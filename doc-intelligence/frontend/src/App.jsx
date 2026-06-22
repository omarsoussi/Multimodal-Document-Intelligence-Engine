import { useEffect, useMemo, useState } from 'react'

import { deleteDocument, listDocuments } from './api/client'
import ChatWindow from './components/ChatWindow'
import DocumentList from './components/DocumentList'
import UploadZone from './components/UploadZone'

function App() {
  const [documents, setDocuments] = useState([])
  const [activeDocId, setActiveDocId] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    refreshDocuments()
  }, [])

  const activeDocument = useMemo(
    () => documents.find((document) => document.id === activeDocId) || null,
    [documents, activeDocId]
  )

  const showToast = (message, type) => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3500)
  }

  const handleDelete = async (docId) => {
    try {
      await deleteDocument(docId)
      if (activeDocId === docId) {
        setActiveDocId(null)
      }
      await refreshDocuments()
      showToast('Document deleted', 'success')
    } catch (error) {
      showToast(error.response?.data?.detail || 'Delete failed', 'error')
    }
  }

  const handleUploaded = async (document) => {
    setDocuments((current) => [document, ...current])
    setActiveDocId(document.id)
    await refreshDocuments()
  }

  const refreshDocuments = async () => {
    try {
      setDocuments(await listDocuments())
    } catch (error) {
      showToast(error.response?.data?.detail || 'Could not load documents', 'error')
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-950">
      <aside className="flex h-screen w-[300px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <UploadZone onUploaded={handleUploaded} onToast={showToast} />
        <DocumentList
          documents={documents}
          activeDocId={activeDocId}
          onSelect={setActiveDocId}
          onDelete={handleDelete}
        />
      </aside>
      <ChatWindow activeDocument={activeDocument} onToast={showToast} />
      {toast && (
        <div
          role="status"
          className={`fixed right-5 top-5 rounded-lg px-4 py-3 text-sm font-semibold shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default App
