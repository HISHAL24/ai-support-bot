import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Upload, FileText, Trash2, CheckCircle, AlertCircle,
  Loader2, Database, Cpu, RefreshCw, FolderOpen, X
} from 'lucide-react'

const API = 'http://127.0.0.1:8000'

function StatCard({ icon: Icon, label, value, color = 'text-brand-400' }) {
  return (
    <div className="card flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-base font-semibold text-slate-100">{value}</p>
      </div>
    </div>
  )
}

function DocumentRow({ name, onRemove }) {
  return (
    <div className="flex items-center gap-2 bg-white/3 border border-white/8 rounded-lg px-3 py-2 group">
      <FileText size={14} className="text-brand-400 flex-shrink-0" />
      <span className="text-sm text-slate-300 truncate flex-1">{name}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-slate-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

function UploadZone({ onFiles, uploading }) {
  const [drag, setDrag]     = useState(false)
  const fileRef             = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDrag(false)
    const files = [...e.dataTransfer.files].filter(f => f.name.endsWith('.pdf'))
    if (files.length) onFiles(files)
  }, [onFiles])

  return (
    <div
      onDragEnter={e => { e.preventDefault(); setDrag(true) }}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={e => { e.preventDefault(); setDrag(false) }}
      onDrop={handleDrop}
      onClick={() => !uploading && fileRef.current?.click()}
      className={`
        relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
        ${drag
          ? 'border-brand-500 bg-brand-500/10'
          : 'border-white/15 hover:border-white/30 hover:bg-white/3'
        }
        ${uploading ? 'cursor-not-allowed opacity-60' : ''}
      `}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={e => onFiles([...e.target.files])}
        disabled={uploading}
      />
      <div className="flex flex-col items-center gap-3">
        {uploading
          ? <Loader2 size={32} className="text-brand-400 animate-spin" />
          : <Upload size={32} className={drag ? 'text-brand-400' : 'text-slate-500'} />
        }
        <div>
          <p className="text-sm font-medium text-slate-300">
            {uploading ? 'Processing PDF…' : drag ? 'Drop to upload' : 'Drop PDFs here or click to browse'}
          </p>
          <p className="text-xs text-slate-600 mt-1">Supports PDF files · Text-based (not scanned images)</p>
        </div>
      </div>
    </div>
  )
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  const isErr = toast.type === 'error'
  return (
    <div className={`
      flex items-start gap-2 rounded-xl px-4 py-3 shadow-xl border text-sm animate-slide-up
      ${isErr
        ? 'bg-rose-950/80 border-rose-500/30 text-rose-200'
        : 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200'
      }
    `}>
      {isErr ? <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> : <CheckCircle size={16} className="mt-0.5 flex-shrink-0 text-emerald-400" />}
      <span className="flex-1">{toast.message}</span>
      <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={14} /></button>
    </div>
  )
}

export default function Admin() {
  const [status, setStatus]     = useState(null)
  const [uploading, setUploading] = useState(false)
  const [toasts, setToasts]     = useState([])
  const [resetting, setResetting] = useState(false)

  const addToast = (message, type = 'success') =>
    setToasts(t => [...t, { id: Date.now(), message, type }])
  const removeToast = (id) =>
    setToasts(t => t.filter(x => x.id !== id))

  const fetchStatus = async () => {
    try {
      const res  = await fetch(`${API}/status`)
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus(null)
    }
  }

  useEffect(() => { fetchStatus() }, [])

  const handleFiles = async (files) => {
    setUploading(true)
    for (const file of files) {
      const form = new FormData()
      form.append('file', file)
      try {
        const res  = await fetch(`${API}/upload`, { method: 'POST', body: form })
        const data = await res.json()
        if (res.ok) {
          addToast(`✓ "${file.name}" — ${data.chunks_added} chunks indexed`)
        } else {
          addToast(data.detail || `Failed to upload "${file.name}"`, 'error')
        }
      } catch {
        addToast(`Network error uploading "${file.name}"`, 'error')
      }
    }
    setUploading(false)
    fetchStatus()
  }

  const handleReset = async () => {
    if (!window.confirm('Delete ALL indexed documents? This cannot be undone.')) return
    setResetting(true)
    try {
      const res = await fetch(`${API}/reset`, { method: 'DELETE' })
      if (res.ok) addToast('Vector store cleared.')
      else        addToast('Reset failed.', 'error')
    } catch {
      addToast('Network error.', 'error')
    }
    setResetting(false)
    fetchStatus()
  }

  const online = status !== null

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full">
      {/* Status cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">System Status</h2>
          <button onClick={fetchStatus} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Database}
            label="Indexed Chunks"
            value={status?.total_chunks ?? '—'}
            color="text-brand-400"
          />
          <StatCard
            icon={Cpu}
            label="AI Models"
            value={status?.model_ready ? 'Ready' : online ? 'Loading…' : 'Offline'}
            color={status?.model_ready ? 'text-emerald-400' : 'text-amber-400'}
          />
        </div>
      </div>

      {/* Upload */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Upload Documents</h2>
        <UploadZone onFiles={handleFiles} uploading={uploading} />
      </div>

      {/* Indexed docs */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Indexed Documents
            {status?.documents?.length > 0 && (
              <span className="ml-2 text-xs font-normal text-slate-500 normal-case tracking-normal">
                {status.documents.length} file{status.documents.length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
        </div>

        {!status ? (
          <div className="flex items-center gap-2 text-slate-600 text-sm p-2">
            <Loader2 size={14} className="animate-spin" />
            Connecting to backend…
          </div>
        ) : status.documents?.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FolderOpen size={28} className="text-slate-700" />
            <p className="text-sm text-slate-600">No documents indexed yet.</p>
            <p className="text-xs text-slate-700">Upload a PDF above to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {status.documents.map((doc, i) => (
              <DocumentRow key={i} name={doc} />
            ))}
          </div>
        )}
      </div>

      {/* RAG pipeline explainer */}
      <div className="card bg-brand-900/20 border-brand-700/20">
        <h3 className="text-xs font-semibold text-brand-300 uppercase tracking-wider mb-3">How It Works</h3>
        <ol className="space-y-2">
          {[
            ['Extract', 'PDF text is extracted page by page'],
            ['Chunk',   'Text split into 500-char overlapping segments'],
            ['Embed',   'all-MiniLM-L6-v2 encodes each chunk'],
            ['Store',   'Vectors saved to FAISS flat L2 index'],
            ['Query',   'Question embedded → top-3 chunks retrieved'],
            ['Answer',  'RoBERTa QA model reads context + returns answer'],
          ].map(([step, desc], i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
              <span className="font-mono text-brand-400 w-12 flex-shrink-0">{step}</span>
              {desc}
            </li>
          ))}
        </ol>
      </div>

      {/* Danger zone */}
      <div className="card border-rose-500/15">
        <h3 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2">Danger Zone</h3>
        <p className="text-xs text-slate-500 mb-3">Remove all indexed documents and reset the vector store.</p>
        <button
          onClick={handleReset}
          disabled={resetting || !online}
          className="flex items-center gap-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10
                     border border-rose-500/20 hover:border-rose-500/40 px-3 py-1.5 rounded-lg
                     transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {resetting
            ? <Loader2 size={14} className="animate-spin" />
            : <Trash2 size={14} />
          }
          Reset Vector Store
        </button>
      </div>

      {/* Toast stack */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50 w-80">
        {toasts.map(t => (
          <Toast key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </div>
  )
}