import React, { useState, useRef, useEffect } from 'react';
import { chatAPI } from '../utils/api';
import { Send, Bot, User, ThumbsUp, ThumbsDown, FileText, Zap, AlertCircle } from 'lucide-react';

const CONFIDENCE_COLORS = {
  high: '#22c55e',
  medium: '#f59e0b',
  low: '#ef4444',
};

function ConfidenceBadge({ score }) {
  const pct = Math.round(score * 100);
  const level = pct >= 70 ? 'high' : pct >= 40 ? 'medium' : 'low';
  const label = pct >= 70 ? 'High confidence' : pct >= 40 ? 'Medium confidence' : 'Low confidence';
  return (
    <span style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:11,color:CONFIDENCE_COLORS[level],background:`${CONFIDENCE_COLORS[level]}18`,padding:'2px 8px',borderRadius:12,marginTop:6 }}>
      <Zap size={10} /> {label} ({pct}%)
    </span>
  );
}

function Message({ msg, onFeedback }) {
  const [feedback, setFeedback] = useState(null);

  const handleFeedback = (rating) => {
    setFeedback(rating);
    onFeedback(msg.message_id, rating);
  };

  if (msg.role === 'user') {
    return (
      <div style={{ display:'flex',justifyContent:'flex-end',marginBottom:16 }}>
        <div style={{ maxWidth:'75%',display:'flex',alignItems:'flex-start',gap:8,flexDirection:'row-reverse' }}>
          <div style={{ width:32,height:32,borderRadius:'50%',background:'#6366f1',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
            <User size={16} color="#fff" />
          </div>
          <div style={{ background:'#6366f1',color:'#fff',padding:'10px 14px',borderRadius:'18px 4px 18px 18px',fontSize:14,lineHeight:1.5 }}>
            {msg.text}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:'flex',marginBottom:16 }}>
      <div style={{ maxWidth:'80%',display:'flex',alignItems:'flex-start',gap:8 }}>
        <div style={{ width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <Bot size={16} color="#fff" />
        </div>
        <div>
          <div style={{ background:'#1e293b',color:'#e2e8f0',padding:'10px 14px',borderRadius:'4px 18px 18px 18px',fontSize:14,lineHeight:1.6,border:'1px solid #334155' }}>
            {msg.loading ? (
              <span style={{ display:'flex',gap:4,alignItems:'center' }}>
                <span className="dot" style={{ width:6,height:6,borderRadius:'50%',background:'#6366f1',animation:'bounce 1s infinite' }} />
                <span className="dot" style={{ width:6,height:6,borderRadius:'50%',background:'#6366f1',animation:'bounce 1s infinite 0.2s' }} />
                <span className="dot" style={{ width:6,height:6,borderRadius:'50%',background:'#6366f1',animation:'bounce 1s infinite 0.4s' }} />
              </span>
            ) : msg.text}
          </div>
          {!msg.loading && msg.confidence !== undefined && (
            <div style={{ marginTop:4 }}>
              <ConfidenceBadge score={msg.confidence} />
            </div>
          )}
          {!msg.loading && msg.sources?.length > 0 && (
            <div style={{ marginTop:8,display:'flex',flexWrap:'wrap',gap:4 }}>
              {msg.sources.map((s, i) => (
                <span key={i} style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:11,color:'#94a3b8',background:'#0f172a',padding:'2px 8px',borderRadius:12,border:'1px solid #334155' }}>
                  <FileText size={9} /> {s.doc_name}
                </span>
              ))}
            </div>
          )}
          {!msg.loading && msg.message_id && (
            <div style={{ marginTop:8,display:'flex',gap:8 }}>
              <button onClick={() => handleFeedback(1)} style={{ background:feedback===1?'#22c55e22':'transparent',border:'1px solid',borderColor:feedback===1?'#22c55e':'#334155',borderRadius:8,padding:'3px 8px',cursor:'pointer',color:feedback===1?'#22c55e':'#64748b',display:'flex',alignItems:'center',gap:4,fontSize:11 }}>
                <ThumbsUp size={11} /> Helpful
              </button>
              <button onClick={() => handleFeedback(-1)} style={{ background:feedback===-1?'#ef444422':'transparent',border:'1px solid',borderColor:feedback===-1?'#ef4444':'#334155',borderRadius:8,padding:'3px 8px',cursor:'pointer',color:feedback===-1?'#ef4444':'#64748b',display:'flex',alignItems:'center',gap:4,fontSize:11 }}>
                <ThumbsDown size={11} /> Not helpful
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hello! I'm your AI support assistant. How can I help you today?", id: 'welcome' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [suggested, setSuggested] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    chatAPI.suggestedQuestions().then(res => setSuggested(res.data.questions)).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const q = text.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q, id: Date.now() }]);
    const botId = Date.now() + 1;
    setMessages(prev => [...prev, { role: 'bot', loading: true, id: botId }]);
    setLoading(true);
    try {
      const res = await chatAPI.ask(q, sessionId);
      const { answer, sources, confidence, session_id, message_id } = res.data;
      if (!sessionId) setSessionId(session_id);
      setMessages(prev => prev.map(m => m.id === botId ? { ...m, loading: false, text: answer, sources, confidence, message_id } : m));
    } catch {
      setMessages(prev => prev.map(m => m.id === botId ? { ...m, loading: false, text: "Sorry, I'm having trouble connecting. Please try again.", sources: [], confidence: 0 } : m));
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = (messageId, rating) => {
    chatAPI.feedback(sessionId, messageId, rating).catch(() => {});
  };

  return (
    <div style={{ minHeight:'100vh',background:'#0f172a',display:'flex',flexDirection:'column',alignItems:'center',padding:'20px 16px',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
      
      {/* Header */}
      <div style={{ width:'100%',maxWidth:720,marginBottom:16 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <div style={{ width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Bot size={22} color="#fff" />
            </div>
            <div>
              <div style={{ color:'#f1f5f9',fontWeight:700,fontSize:16 }}>Support Assistant</div>
              <div style={{ color:'#22c55e',fontSize:12,display:'flex',alignItems:'center',gap:4 }}>
                <span style={{ width:6,height:6,borderRadius:'50%',background:'#22c55e',display:'inline-block' }} /> Online
              </div>
            </div>
          </div>
          <a href="/login" style={{ color:'#6366f1',fontSize:13,textDecoration:'none',padding:'6px 14px',border:'1px solid #334155',borderRadius:8 }}>Admin</a>
        </div>
      </div>

      {/* Chat Window */}
      <div style={{ width:'100%',maxWidth:720,background:'#1e293b',borderRadius:16,border:'1px solid #334155',display:'flex',flexDirection:'column',height:'calc(100vh - 140px)' }}>
        <div style={{ flex:1,overflowY:'auto',padding:20 }}>
          {messages.map(msg => (
            <Message key={msg.id} msg={msg} onFeedback={handleFeedback} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Suggested Questions */}
        {messages.length <= 1 && suggested.length > 0 && (
          <div style={{ padding:'0 20px 12px',display:'flex',flexWrap:'wrap',gap:8 }}>
            {suggested.map((q, i) => (
              <button key={i} onClick={() => sendMessage(q)}
                style={{ background:'#0f172a',color:'#94a3b8',border:'1px solid #334155',borderRadius:20,padding:'6px 12px',fontSize:12,cursor:'pointer',whiteSpace:'nowrap' }}>
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding:16,borderTop:'1px solid #334155' }}>
          <div style={{ display:'flex',gap:10,alignItems:'center' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
              placeholder="Ask a question..."
              style={{ flex:1,background:'#0f172a',border:'1px solid #334155',borderRadius:12,padding:'10px 16px',color:'#f1f5f9',fontSize:14,outline:'none' }}
            />
            <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
              style={{ width:42,height:42,borderRadius:12,background: loading||!input.trim()?'#334155':'#6366f1',border:'none',cursor: loading||!input.trim()?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background 0.2s' }}>
              <Send size={18} color="#fff" />
            </button>
          </div>
          <div style={{ textAlign:'center',color:'#475569',fontSize:11,marginTop:8 }}>Powered by RAG AI · Answers sourced from company documentation</div>
        </div>
      </div>
    </div>
  );
}
