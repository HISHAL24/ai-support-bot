import { useState } from 'react'
import { MessageSquare, Settings, Zap } from 'lucide-react'
import Chat  from './Chat.jsx'
import Admin from './Admin.jsx'

const TABS = [
  { id: 'chat',  label: 'Chat',  Icon: MessageSquare },
  { id: 'admin', label: 'Admin', Icon: Settings },
]

export default function App() {
  const [tab, setTab] = useState('chat')

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* App shell — fixed size on desktop, full screen on mobile */}
      <div className="w-full max-w-lg h-[680px] flex flex-col rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 bg-slate-900">

        {/* Header */}
        <header className="flex items-center gap-3 px-5 py-4 border-b border-white/8 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center">
            <Zap size={16} className="text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-slate-100 leading-tight">AI Support Bot</h1>
            <p className="text-xs text-slate-500 leading-tight truncate">RAG · FAISS · Sentence Transformers</p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-white/5 border border-white/8 rounded-lg p-0.5">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                  ${tab === id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                  }
                `}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          <div className={`absolute inset-0 transition-opacity duration-200 ${tab === 'chat'  ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <Chat />
          </div>
          <div className={`absolute inset-0 transition-opacity duration-200 ${tab === 'admin' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <Admin />
          </div>
        </div>
      </div>
    </div>
  )
}