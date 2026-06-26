import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, FileText, AlertCircle, Loader2, ChevronDown, Sparkles } from 'lucide-react'

const API = '/api'

function ConfidenceBadge({ score }) {
  const pct  = Math.round(score * 100)
  const color = pct >= 70 ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
              : pct >= 40 ? 'text-amber-400  bg-amber-400/10  border-amber-400/20'
              :              'text-rose-400   bg-rose-400/10   border-rose-400/20'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full border ${color}`}>
      {pct}% confident
    </span>
  )
}

function SourceTag({ name }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
      <FileText size={11} />
      {name}
    </span>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot size={16} className="text-brand-400" />
      </div>
      <div className="card px-4 py-3">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  const [showContext, setShowContext] = useState(false)

  if (isUser) {
    return (
      <div className="flex items-start gap-3 justify-end animate-slide-up">
        <div className="max-w-[75%] bg-brand-600/80 border border-brand-500/40 rounded-xl rounded-tr-sm px-4 py-3">
          <p className="text-sm text-white leading-relaxed">{msg.content}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User size={15} className="text-slate-300" />
        </div>
      </div>
    )
  }

  if (msg.error) {
    return (
      <div className="flex items-start gap-3 animate-slide-up">
        <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertCircle size={15} className="text-rose-400" />
        </div>
        <div className="card border-rose-500/20 px-4 py-3 max-w-[75%]">
          <p className="text-sm text-rose-300 leading-relaxed">{msg.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 animate-slide-up">
      <div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot size={16} className="text-brand-400" />
      </div>
      <div className="flex flex-col gap-2 max-w-[75%]">
        <div className="card px-4 py-3">
          <p className="text-sm text-slate-100 leading-relaxed">{msg.content}</p>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 px-1">
          {msg.confidence !== undefined && <ConfidenceBadge score={msg.confidence} />}
          {msg.sources?.map((s, i) => <SourceTag key={i} name={s} />)}

          {msg.context && (
            <button
              onClick={() => setShowContext(v => !v)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ChevronDown size={12} className={`transition-transform ${showContext ? 'rotate-180' : ''}`} />
              {showContext ? 'Hide' : 'View'} source chunk
            </button>
          )}
        </div>

        {/* Context preview */}
        {showContext && msg.context && (
          <div className="card border-slate-700/50 px-3 py-2.5 animate-fade-in">
            <p className="text-xs font-mono text-slate-400 leading-relaxed line-clamp-6">{msg.context}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  const suggestions = [
    'What is the refund policy?',
    'How do I reset my password?',
    'How can I export my data?',
    'What are the subscription tiers?',
  ]
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 py-12 animate-fade-in">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center">
          <Sparkles size={28} className="text-brand-400" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-950" />
      </div>
      <div className="text-center">
        <h3 className="text-slate-200 font-semibold text-lg">Ask me anything</h3>
        <p className="text-slate-500 text-sm mt-1">Powered by your uploaded documents</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
        {suggestions.map((s, i) => (
          <button
            key={i}
            className="text-left text-xs text-slate-400 hover:text-slate-200 bg-white/3 hover:bg-white/8 border border-white/8 hover:border-white/15 rounded-lg px-3 py-2.5 transition-all duration-200"
            onClick={() => {
              document.getElementById('chat-input')?.focus()
              // Bubble up via custom event
              window.dispatchEvent(new CustomEvent('suggestion', { detail: s }))
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Chat() {
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [noIndex, setNoIndex]     = useState(false)
  const bottomRef                 = useRef(null)
  const inputRef                  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Handle suggestion clicks from EmptyState
  useEffect(() => {
    const handler = (e) => setInput(e.detail)
    window.addEventListener('suggestion', handler)
    return () => window.removeEventListener('suggestion', handler)
  }, [])

  const sendMessage = async (text) => {
    const q = (text ?? input).trim()
    if (!q || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setLoading(true)
    setNoIndex(false)

    try {
      const res = await fetch(`${API}/ask`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ question: q }),
      })

      const data = await res.json()

      if (!res.ok) {
        const detail = data.detail || 'Something went wrong.'
        const is404  = res.status === 404
        if (is404) setNoIndex(true)
        setMessages(prev => [...prev, { role: 'bot', content: detail, error: true }])
      } else {
        setMessages(prev => [...prev, {
          role:       'bot',
          content:    data.answer,
          confidence: data.confidence,
          sources:    data.sources,
          context:    data.context,
          error:      false,
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot', content: 'Could not reach the backend. Is the server running?', error: true,
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Banner when no docs indexed */}
      {noIndex && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-amber-300 text-xs animate-fade-in">
          <AlertCircle size={14} />
          No documents indexed yet. Upload a PDF in the <strong className="ml-1">Admin</strong> tab first.
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((m, i) => <Message key={i} msg={m} />)
        )}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/8 p-4">
        <div className="flex gap-2 items-end">
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask a question about your documents…"
            className="input-field resize-none min-h-[44px] max-h-32 leading-relaxed"
            style={{ height: 'auto' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="btn-primary flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0"
          >
            {loading
              ? <Loader2 size={18} className="animate-spin" />
              : <Send size={18} />
            }
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-2 text-center">
          Answers are generated from indexed documents · Always verify important information
        </p>
      </div>
    </div>
  )
}