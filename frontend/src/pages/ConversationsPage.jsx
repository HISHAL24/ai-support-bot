import React, { useState, useEffect } from 'react';
import { chatAPI } from '../utils/api';
import { MessageSquare, ChevronRight, ThumbsUp, ThumbsDown, AlertTriangle, Zap } from 'lucide-react';

export default function ConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);

  useEffect(() => {
    chatAPI.conversations()
      .then(res => setConversations(res.data))
      .finally(() => setLoading(false));
  }, []);

  const loadConversation = async (conv) => {
    setSelected(conv);
    setMsgLoading(true);
    try {
      const res = await chatAPI.conversation(conv._id);
      setMessages(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setMsgLoading(false);
    }
  };

  return (
    <div style={{ padding:32 }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ color:'#f1f5f9',fontSize:22,fontWeight:700,margin:'0 0 4px' }}>Conversations</h1>
        <p style={{ color:'#64748b',fontSize:14,margin:0 }}>Review all customer support sessions</p>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'300px 1fr',gap:16,height:'calc(100vh - 180px)' }}>
        {/* List */}
        <div style={{ background:'#1e293b',border:'1px solid #334155',borderRadius:12,overflowY:'auto' }}>
          {loading ? (
            <div style={{ color:'#64748b',textAlign:'center',padding:40 }}>Loading...</div>
          ) : conversations.length === 0 ? (
            <div style={{ color:'#64748b',textAlign:'center',padding:40 }}>No conversations yet</div>
          ) : conversations.map(conv => (
            <button key={conv._id} onClick={() => loadConversation(conv)}
              style={{ width:'100%',textAlign:'left',background: selected?._id === conv._id ? '#6366f110' : 'transparent',border:'none',borderBottom:'1px solid #334155',padding:'14px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,transition:'background 0.1s' }}>
              <div style={{ width:36,height:36,borderRadius:'50%',background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                <MessageSquare size={16} color="#6366f1" />
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ color:'#f1f5f9',fontSize:13,fontWeight:500 }}>Session {conv._id?.slice(-6)}</div>
                <div style={{ color:'#64748b',fontSize:12 }}>{conv.message_count} messages · {conv.last_message ? new Date(conv.last_message).toLocaleDateString() : ''}</div>
              </div>
              <ChevronRight size={14} color="#475569" />
            </button>
          ))}
        </div>

        {/* Detail */}
        <div style={{ background:'#1e293b',border:'1px solid #334155',borderRadius:12,overflowY:'auto',padding:20 }}>
          {!selected ? (
            <div style={{ textAlign:'center',color:'#475569',padding:60 }}>
              <MessageSquare size={36} style={{ margin:'0 auto 12px',opacity:0.4 }} />
              <div>Select a conversation to view messages</div>
            </div>
          ) : msgLoading ? (
            <div style={{ color:'#64748b',textAlign:'center',padding:60 }}>Loading messages...</div>
          ) : messages.map(msg => (
            <div key={msg._id} style={{ marginBottom:20,background:'#0f172a',borderRadius:12,padding:16,border:'1px solid #334155' }}>
              <div style={{ marginBottom:10 }}>
                <div style={{ color:'#94a3b8',fontSize:12,marginBottom:6,display:'flex',alignItems:'center',gap:6 }}>
                  <span style={{ background:'#6366f118',color:'#818cf8',padding:'2px 8px',borderRadius:12,fontSize:11 }}>Q</span>
                  <span>{new Date(msg.timestamp).toLocaleString()}</span>
                </div>
                <div style={{ color:'#f1f5f9',fontSize:14 }}>{msg.question}</div>
              </div>
              <div style={{ borderTop:'1px solid #1e293b',paddingTop:10 }}>
                <div style={{ color:'#94a3b8',fontSize:12,marginBottom:6,display:'flex',alignItems:'center',gap:6 }}>
                  <span style={{ background:'#22c55e18',color:'#22c55e',padding:'2px 8px',borderRadius:12,fontSize:11 }}>A</span>
                  {msg.confidence !== undefined && (
                    <span style={{ color: msg.confidence >= 0.7 ? '#22c55e' : msg.confidence >= 0.4 ? '#f59e0b' : '#ef4444',fontSize:11,display:'flex',alignItems:'center',gap:3 }}>
                      <Zap size={10} /> {Math.round(msg.confidence * 100)}%
                    </span>
                  )}
                  {msg.flagged && <span style={{ color:'#ef4444',fontSize:11,display:'flex',alignItems:'center',gap:3 }}><AlertTriangle size={10} /> Flagged</span>}
                  {msg.feedback === 1 && <span style={{ color:'#22c55e',fontSize:11,display:'flex',alignItems:'center',gap:3 }}><ThumbsUp size={10} /> Helpful</span>}
                  {msg.feedback === -1 && <span style={{ color:'#ef4444',fontSize:11,display:'flex',alignItems:'center',gap:3 }}><ThumbsDown size={10} /> Not helpful</span>}
                </div>
                <div style={{ color:'#cbd5e1',fontSize:14,lineHeight:1.6 }}>{msg.answer}</div>
                {msg.sources?.length > 0 && (
                  <div style={{ marginTop:8,display:'flex',gap:6,flexWrap:'wrap' }}>
                    {msg.sources.map((s, i) => (
                      <span key={i} style={{ fontSize:11,color:'#64748b',background:'#1e293b',padding:'2px 8px',borderRadius:10,border:'1px solid #334155' }}>{s.doc_name}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
