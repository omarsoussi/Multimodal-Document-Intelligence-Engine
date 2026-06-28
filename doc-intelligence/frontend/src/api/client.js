import axios from 'axios'

/**
 * @typedef {{ id: string, filename: string, chunk_count: number, uploaded_at: string, file_type: string, page_count: number, language: string, category: string, reading_minutes: number, summary: string }} DocumentMetadata
 * @typedef {{ page_number: number, chunk_index: number, chunk_text: string, score: number, source_filename: string }} Citation
 * @typedef {{ answer: string, citations: Citation[], model_used: string }} QueryResponse
 * @typedef {{ role: string, content: string, created_at: string, citations: Citation[] }} ConversationMessage
 * @typedef {{ id: string, title: string, doc_id: string | null, doc_filename: string | null, message_count: number, created_at: string, updated_at: string }} ConversationSummary
 * @typedef {{ id: string, title: string, doc_id: string | null, doc_filename: string | null, messages: ConversationMessage[], created_at: string, updated_at: string }} Conversation
 * @typedef {{ label: string, value: number }} BreakdownStat
 * @typedef {{ doc_id: string, filename: string, file_type: string, category: string, language: string, total_pages: number, reading_minutes: number, summary: string, uploaded_at: string }} DocumentSpotlight
 * @typedef {{ total_documents: number, total_languages: number, total_categories: number, total_reading_hours: number, documents_by_category: BreakdownStat[], documents_by_language: BreakdownStat[], documents_by_format: BreakdownStat[], reading_time_bands: BreakdownStat[], uploads_by_date: { date: string, count: number }[], library_highlights: string[], document_spotlights: DocumentSpotlight[] }} OverviewStats
 * @typedef {{ metric: string, value: number }} RadarMetric
 * @typedef {{ word: string, count: number }} KeywordStat
 * @typedef {{ id: string, label: string, group: string, weight: number }} MindMapNode
 * @typedef {{ source: string, target: string, weight: number }} MindMapEdge
 * @typedef {{ nodes: MindMapNode[], edges: MindMapEdge[] }} MindMapGraph
 * @typedef {{ doc_id: string, filename: string, file_type: string, detected_language: string, detected_category: string, uploaded_at: string, total_pages: number, estimated_word_count: number, reading_minutes: number, summary: string, key_takeaways: string[], top_keywords: KeywordStat[], topic_breakdown: BreakdownStat[], radar_profile: RadarMetric[], mind_map: MindMapGraph }} DocumentStats
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
export const queryDocuments = async (question, docId, topK = 4) => {
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
export const sendMessage = async (conversationId, question, topK = 4) => {
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

/**
 * @param {'/tools/pdf-to-docx' | '/tools/docx-to-pdf' | '/tools/compress-pdf' | '/tools/split-pdf'} endpoint
 * @param {FormData} formData
 * @returns {Promise<string>}
 */
async function runTool(endpoint, formData) {
  const response = await api.post(endpoint, formData, { responseType: 'blob' })
  const filename = extractFilename(response.headers['content-disposition']) || 'download'
  const blob = new Blob([response.data], {
    type: response.headers['content-type'] || 'application/octet-stream'
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
  return filename
}

function extractFilename(contentDisposition) {
  if (!contentDisposition) {
    return null
  }
  const match = contentDisposition.match(/filename="?([^"]+)"?/)
  return match?.[1] || null
}

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
export const convertPdfToDocx = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return runTool('/tools/pdf-to-docx', formData)
}

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
export const convertDocxToPdf = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return runTool('/tools/docx-to-pdf', formData)
}

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
export const compressPdf = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return runTool('/tools/compress-pdf', formData)
}

/**
 * @param {File} file
 * @param {string} ranges
 * @returns {Promise<string>}
 */
export const splitPdf = async (file, ranges) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('ranges', ranges)
  return runTool('/tools/split-pdf', formData)
}
