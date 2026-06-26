import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../utils/api';
import { AlertTriangle, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AnalyticsPage() {
  const [dashboard, setDashboard] = useState(null);
  const [flagged, setFlagged] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    Promise.all([
      analyticsAPI.dashboard(),
      analyticsAPI.flagged(),
      analyticsAPI.knowledgeGaps(),
    ]).then(([d, f, g]) => {
      setDashboard(d.data);
      setFlagged(f.data);
      setGaps(g.data);
    }).finally(() => setLoading(false));
  }, []);

  const feedbackData = dashboard ? [
    { name: 'Positive', value: dashboard.positive_feedback, color: '#22c55e' },
    { name: 'Negative', value: dashboard.negative_feedback, color: '#ef4444' },
  ] : [];

  const tabs = ['overview', 'flagged', 'knowledge gaps'];

  return (
    <div style={{ padding:32 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ color:'#f1f5f9',fontSize:22,fontWeight:700,margin:'0 0 4px' }}>Analytics</h1>
        <p style={{ color:'#64748b',fontSize:14,margin:0 }}>Insights and quality metrics for your support bot</p>
      </div>

      <div style={{ display:'flex',gap:4,marginBottom:24,background:'#1e293b',padding:4,borderRadius:10,width:'fit-content',border:'1px solid #334155' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'8px 16px',borderRadius:8,border:'none',cursor:'pointer',fontSize:13,fontWeight:500,textTransform:'capitalize',background: tab===t ? '#6366f1' : 'transparent',color: tab===t ? '#fff' : '#64748b',transition:'all 0.2s' }}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color:'#64748b',textAlign:'center',padding:60 }}>Loading analytics...</div>
      ) : tab === 'overview' ? (
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
          {/* Messages Chart */}
          <div style={{ background:'#1e293b',border:'1px solid #334155',borderRadius:12,padding:24,gridColumn:'1/-1' }}>
            <h3 style={{ color:'#f1f5f9',fontSize:15,fontWeight:600,margin:'0 0 20px' }}>Daily Messages (7 Days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dashboard?.daily_messages?.map(d => ({ date: d._id?.slice(5), count: d.count })) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#475569" fontSize={12} />
                <YAxis stroke="#475569" fontSize={12} />
                <Tooltip contentStyle={{ background:'#0f172a',border:'1px solid #334155',color:'#f1f5f9' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Feedback Pie */}
          <div style={{ background:'#1e293b',border:'1px solid #334155',borderRadius:12,padding:24 }}>
            <h3 style={{ color:'#f1f5f9',fontSize:15,fontWeight:600,margin:'0 0 20px' }}>Feedback Distribution</h3>
            {feedbackData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={feedbackData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {feedbackData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background:'#0f172a',border:'1px solid #334155',color:'#f1f5f9' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign:'center',color:'#475569',padding:40 }}>No feedback yet</div>
            )}
          </div>

          {/* Stats */}
          <div style={{ background:'#1e293b',border:'1px solid #334155',borderRadius:12,padding:24 }}>
            <h3 style={{ color:'#f1f5f9',fontSize:15,fontWeight:600,margin:'0 0 16px' }}>Quality Metrics</h3>
            {[
              { label: 'Average Confidence', value: `${dashboard?.avg_confidence || 0}%` },
              { label: 'Flagged Rate', value: dashboard?.total_messages > 0 ? `${((dashboard.flagged_messages / dashboard.total_messages) * 100).toFixed(1)}%` : '0%' },
              { label: 'Positive Rate', value: (dashboard?.positive_feedback + dashboard?.negative_feedback) > 0 ? `${((dashboard.positive_feedback / (dashboard.positive_feedback + dashboard.negative_feedback)) * 100).toFixed(1)}%` : 'N/A' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #334155' }}>
                <span style={{ color:'#94a3b8',fontSize:14 }}>{label}</span>
                <span style={{ color:'#f1f5f9',fontSize:14,fontWeight:600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : tab === 'flagged' ? (
        <div>
          <p style={{ color:'#64748b',fontSize:13,marginBottom:16 }}>Messages with confidence below 40% that may need attention</p>
          {flagged.length === 0 ? (
            <div style={{ textAlign:'center',color:'#64748b',padding:60 }}>No flagged messages — great job!</div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {flagged.map(m => (
                <div key={m._id} style={{ background:'#1e293b',border:'1px solid #ef444440',borderRadius:12,padding:16 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:8 }}>
                    <AlertTriangle size={14} color="#ef4444" />
                    <span style={{ color:'#ef4444',fontSize:12 }}>Low confidence · {Math.round(m.confidence * 100)}%</span>
                    <span style={{ color:'#475569',fontSize:12,marginLeft:'auto' }}>{new Date(m.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div style={{ color:'#f1f5f9',fontSize:14,marginBottom:6,fontWeight:500 }}>Q: {m.question}</div>
                  <div style={{ color:'#94a3b8',fontSize:13 }}>A: {m.answer?.slice(0, 200)}{m.answer?.length > 200 ? '...' : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <p style={{ color:'#64748b',fontSize:13,marginBottom:16 }}>Questions with very low confidence scores — consider adding documentation for these topics</p>
          {gaps.length === 0 ? (
            <div style={{ textAlign:'center',color:'#64748b',padding:60 }}>No knowledge gaps detected</div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {gaps.map(m => (
                <div key={m._id} style={{ background:'#1e293b',border:'1px solid #f59e0b40',borderRadius:12,padding:16 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:8 }}>
                    <Zap size={14} color="#f59e0b" />
                    <span style={{ color:'#f59e0b',fontSize:12 }}>Confidence: {Math.round(m.confidence * 100)}%</span>
                    <span style={{ color:'#475569',fontSize:12,marginLeft:'auto' }}>{new Date(m.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div style={{ color:'#f1f5f9',fontSize:14,fontWeight:500 }}>{m.question}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
