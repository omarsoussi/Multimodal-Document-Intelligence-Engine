import axios from 'axios'

/**
 * @typedef {{ id: string, filename: string, chunk_count: number, uploaded_at: string }} DocumentMetadata
 * @typedef {{ page_number: number, chunk_index: number, chunk_text: string, score: number, source_filename: string }} Citation
 * @typedef {{ answer: string, citations: Citation[], model_used: string }} QueryResponse
 * @typedef {(progress: number) => void} ProgressHandler
 */

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'X-API-Key': import.meta.env.VITE_API_KEY || 'dev-secret-key'
  }
})

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
