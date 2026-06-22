import { useRef, useState } from 'react'
import { FileImage, FileText, FileType2, Sparkles, UploadCloud } from 'lucide-react'
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
    <section className="rounded-[28px] border border-white/70 bg-white/92 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Upload document</p>
          <p className="text-xs text-slate-500">Drop a file to index it for chat and analytics.</p>
        </div>
        <div className="rounded-full bg-emerald-50 p-2 text-emerald-500">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
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
        className={`flex min-h-48 w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed px-5 py-6 text-center transition ${
          dragging
            ? 'border-emerald-500 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(255,255,255,0.9))]'
            : 'border-slate-200 bg-[linear-gradient(180deg,rgba(241,245,249,0.95),rgba(255,255,255,0.95))]'
        }`}
      >
        <div className="mb-4 rounded-full bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <UploadCloud className="h-7 w-7 text-slate-500" aria-hidden="true" />
        </div>
        <span className="text-base font-semibold text-slate-900">Drop file here</span>
        <span className="mt-2 text-xs text-slate-500">{supportedTypes}</span>
        <span className="mt-4 flex gap-2 text-slate-400">
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
          <progress
            className="h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-emerald-500 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-emerald-500"
            max="100"
            value={progress}
          />
          <p className="mt-2 text-xs text-slate-500">{progress}% uploaded</p>
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
