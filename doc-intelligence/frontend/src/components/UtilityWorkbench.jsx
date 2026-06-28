import { useRef, useState } from 'react'
import {
  ArrowLeftRight,
  FileArchive,
  FileOutput,
  Scissors,
} from 'lucide-react'
import PropTypes from 'prop-types'

import {
  compressPdf,
  convertDocxToPdf,
  convertPdfToDocx,
  splitPdf,
} from '../api/client'

const TOOL_CARDS = [
  {
    id: 'pdf-to-docx',
    title: 'PDF to DOCX',
    description: 'Turn PDFs into editable Word files.',
    accept: '.pdf',
    actionLabel: 'Convert now',
    icon: ArrowLeftRight,
  },
  {
    id: 'docx-to-pdf',
    title: 'DOCX to PDF',
    description: 'Export Word docs as clean PDFs.',
    accept: '.docx',
    actionLabel: 'Export PDF',
    icon: FileOutput,
  },
  {
    id: 'compress-pdf',
    title: 'Compress PDF',
    description: 'Shrink a PDF for sharing and upload limits.',
    accept: '.pdf',
    actionLabel: 'Compress file',
    icon: FileArchive,
  },
  {
    id: 'split-pdf',
    title: 'Split PDF',
    description: 'Extract page ranges like 1-3,5,8-10.',
    accept: '.pdf',
    actionLabel: 'Split pages',
    icon: Scissors,
  },
]

function UtilityWorkbench({ onToast }) {
  const [files, setFiles] = useState({})
  const [busyTool, setBusyTool] = useState(null)
  const [ranges, setRanges] = useState('1-3')
  const inputRefs = useRef({})

  const handleRun = async (toolId) => {
    const file = files[toolId]
    if (!file) {
      onToast('Choose a file first', 'error')
      return
    }

    setBusyTool(toolId)
    try {
      let filename = ''
      if (toolId === 'pdf-to-docx') {
        filename = await convertPdfToDocx(file)
      } else if (toolId === 'docx-to-pdf') {
        filename = await convertDocxToPdf(file)
      } else if (toolId === 'compress-pdf') {
        filename = await compressPdf(file)
      } else {
        filename = await splitPdf(file, ranges)
      }
      onToast(`Downloaded ${filename}`, 'success')
    } catch (error) {
      onToast(error.response?.data?.detail || 'Tool execution failed', 'error')
    } finally {
      setBusyTool(null)
    }
  }

  return (
    <section className="rounded-[30px] border border-white/60 bg-white/88 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d14e3f]">Document Tools</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">iLovePDF-style actions</h2>
        <p className="mt-1 text-sm text-slate-500">
          Convert, compress, and split files without leaving the workspace.
        </p>
      </div>

      <div className="space-y-3">
        {TOOL_CARDS.map((tool) => (
          <article
            key={tool.id}
            className="rounded-[24px] border border-[#efe6df] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,245,241,0.96))] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{tool.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{tool.description}</p>
              </div>
              <div className="rounded-2xl bg-[#f7ede7] p-3 text-[#d14e3f]">
                <tool.icon className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => inputRefs.current[tool.id]?.click()}
                className="flex w-full items-center justify-between rounded-2xl border border-dashed border-[#dec8bc] bg-white px-3 py-3 text-left transition hover:border-[#d14e3f]"
              >
                <span className="text-sm font-medium text-slate-700">
                  {files[tool.id]?.name || `Choose ${tool.accept.replace('.', '').toUpperCase()} file`}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {tool.accept.replace('.', '')}
                </span>
              </button>
              <input
                ref={(node) => {
                  inputRefs.current[tool.id] = node
                }}
                type="file"
                accept={tool.accept}
                onChange={(event) =>
                  setFiles((current) => ({
                    ...current,
                    [tool.id]: event.target.files?.[0] || null,
                  }))
                }
                className="hidden"
              />

              {tool.id === 'split-pdf' && (
                <input
                  value={ranges}
                  onChange={(event) => setRanges(event.target.value)}
                  placeholder="1-3,5,8-10"
                  className="w-full rounded-2xl border border-[#ead8ce] bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-[#d14e3f]"
                />
              )}

              <button
                type="button"
                onClick={() => handleRun(tool.id)}
                disabled={busyTool === tool.id}
                className="w-full rounded-2xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {busyTool === tool.id ? 'Processing...' : tool.actionLabel}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

UtilityWorkbench.propTypes = {
  onToast: PropTypes.func.isRequired,
}

export default UtilityWorkbench
