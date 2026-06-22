import axios from 'axios'

/**
 * @typedef {{ id: string, filename: string, chunk_count: number, uploaded_at: string }} DocumentMetadata
 * @typedef {{ page_number: number, chunk_index: number, chunk_text: string, score: number, source_filename: string }} Citation
 * @typedef {{ answer: string, citations: Citation[], model_used: string }} QueryResponse
 * @typedef {{ role: string, content: string, created_at: string, citations: Citation[] }} ConversationMessage
 * @typedef {{ id: string, title: string, doc_id: string | null, doc_filename: string | null, message_count: number, created_at: string, updated_at: string }} ConversationSummary
 * @typedef {{ id: string, title: string, doc_id: string | null, doc_filename: string | null, messages: ConversationMessage[], created_at: string, updated_at: string }} Conversation
 * @typedef {{ total_documents: number, total_chunks: number, total_pages: number, avg_chunks_per_doc: number, documents_by_date: { date: string, count: number }[], top_documents: { filename: string, chunk_count: number, uploaded_at: string, pages: number }[], storage_used_kb: number }} OverviewStats
 * @typedef {{ doc_id: string, filename: string, total_chunks: number, total_pages: number, avg_chunk_length: number, longest_chunk_length: number, shortest_chunk_length: number, chunks_per_page: { page: number, chunk_count: number }[], top_keywords: { word: string, count: number }[], uploaded_at: string, estimated_word_count: number }} DocumentStats
 * @typedef {(progress: number) => void} ProgressHandler
 */

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'X-API-Key': import.meta.env.VITE_API_KEY || 'dev-secret-key'
  }
})

function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL
  if (!configured) {
    return defaultApiBaseUrl()
  }

  try {
    const url = new URL(configured)
    if (
      typeof window !== 'undefined' &&
      window.location.hostname &&
      ['localhost', '127.0.0.1'].includes(url.hostname) &&
      url.hostname !== window.location.hostname
    ) {
      url.hostname = window.location.hostname
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    return configured
  }
}

function defaultApiBaseUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:8000'
  }
  return `${window.location.protocol}//${window.location.hostname}:8000`
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API request failed', error)
    throw error
  }
)

/**
 * @param {File} file
 * @param {ProgressHandler} onProgress
 * @returns {Promise<DocumentMetadata>}
 */
export const uploadDocument = async (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/documents/upload', formData, {
    onUploadProgress: (event) => {
      if (event.total) {
        onProgress(Math.round((event.loaded * 100) / event.total))
      }
    }
  })
  return response.data
}

/**
 * @returns {Promise<DocumentMetadata[]>}
 */
export const listDocuments = async () => {
  const response = await api.get('/documents')
  return response.data
}

/**
 * @param {string} docId
 * @returns {Promise<{ id: string, deleted: boolean }>}
 */
export const deleteDocument = async (docId) => {
  const response = await api.delete(`/documents/${docId}`)
  return response.data
}

/**
 * @param {string} question
 * @param {string | null} docId
 * @param {number} topK
 * @returns {Promise<QueryResponse>}
 */
export const queryDocuments = async (question, docId, topK = 5) => {
  const response = await api.post('/query', { question, doc_id: docId, top_k: topK })
  return response.data
}

/**
 * @param {string | null} docId
 * @param {string | null} docFilename
 * @returns {Promise<Conversation>}
 */
export const createConversation = async (docId, docFilename) => {
  const response = await api.post('/conversations', {
    doc_id: docId,
    doc_filename: docFilename
  })
  return response.data
}

/**
 * @returns {Promise<ConversationSummary[]>}
 */
export const listConversations = async () => {
  const response = await api.get('/conversations')
  return response.data
}

/**
 * @param {string} conversationId
 * @returns {Promise<Conversation>}
 */
export const getConversation = async (conversationId) => {
  const response = await api.get(`/conversations/${conversationId}`)
  return response.data
}

/**
 * @param {string} conversationId
 * @param {string} question
 * @param {number} topK
 * @returns {Promise<{ conversation: Conversation, answer: string, citations: Citation[], model_used: string }>}
 */
export const sendMessage = async (conversationId, question, topK = 5) => {
  const response = await api.post(`/conversations/${conversationId}/messages`, {
    question,
    top_k: topK
  })
  return response.data
}

/**
 * @param {string} conversationId
 * @returns {Promise<{ id: string, deleted: boolean }>}
 */
export const deleteConversation = async (conversationId) => {
  const response = await api.delete(`/conversations/${conversationId}`)
  return response.data
}

/**
 * @returns {Promise<OverviewStats>}
 */
export const getOverviewStats = async () => {
  const response = await api.get('/stats/overview')
  return response.data
}

/**
 * @param {string} docId
 * @returns {Promise<DocumentStats>}
 */
export const getDocumentStats = async (docId) => {
  const response = await api.get(`/stats/documents/${docId}`)
  return response.data
}
