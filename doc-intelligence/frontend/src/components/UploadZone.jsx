import { useRef, useState } from 'react'
import { FileImage, FileText, FileType2, UploadCloud } from 'lucide-react'
import PropTypes from 'prop-types'

import { uploadDocument } from '../api/client'

const supportedTypes = 'PDF, PNG, JPG, JPEG, TIFF, DOCX'

function UploadZone({ onUploaded, onToast }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)

  const submitFile = async (file) => {
    setUploading(true)
    setProgress(0)
    try {
      const document = await uploadDocument(file, setProgress)
      onUploaded(document)
      onToast('Document ready', 'success')
    } catch (error) {
      onToast(error.response?.data?.detail || 'Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleFiles = (files) => {
    const file = files?.[0]
    if (file) {
      submitFile(file)
    }
  }

  return (
    <section className="border-b border-slate-200 bg-white p-5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          handleFiles(event.dataTransfer.files)
        }}
        className={`flex min-h-44 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 text-center transition ${
          dragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-50'
        }`}
      >
        <UploadCloud className="mb-3 h-9 w-9 text-slate-500" aria-hidden="true" />
        <span className="text-sm font-semibold text-slate-900">Upload document</span>
        <span className="mt-1 text-xs text-slate-500">{supportedTypes}</span>
        <span className="mt-4 flex gap-2 text-slate-500">
          <FileText className="h-5 w-5" aria-label="PDF" />
          <FileImage className="h-5 w-5" aria-label="Image" />
          <FileType2 className="h-5 w-5" aria-label="Word" />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.tiff,.docx"
        onChange={(event) => handleFiles(event.target.files)}
        className="hidden"
      />
      {uploading && (
        <div className="mt-4">
          <progress value={progress} max="100" className="h-2 w-full accent-emerald-600" />
          <p className="mt-1 text-xs text-slate-500">{progress}% uploaded</p>
        </div>
      )}
    </section>
  )
}

UploadZone.propTypes = {
  onUploaded: PropTypes.func.isRequired,
  onToast: PropTypes.func.isRequired
}

export default UploadZone
