import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../utils/api';
import { MessageSquare, FileText, ThumbsUp, AlertTriangle, TrendingUp, Percent } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div style={{ background:'#1e293b',border:'1px solid #334155',borderRadius:12,padding:20 }}>
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12 }}>
        <div style={{ width:40,height:40,borderRadius:10,background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <Icon size={20} color={color} />
        </div>
      </div>
      <div style={{ color:'#f1f5f9',fontSize:28,fontWeight:700 }}>{value ?? '—'}</div>
      <div style={{ color:'#64748b',fontSize:13,marginTop:4 }}>{label}</div>
      {sub && <div style={{ color:'#475569',fontSize:12,marginTop:4 }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.dashboard()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const chartData = data?.daily_messages?.map(d => ({ date: d._id?.slice(5), messages: d.count })) || [];

  return (
    <div style={{ padding:32 }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ color:'#f1f5f9',fontSize:22,fontWeight:700,margin:'0 0 4px' }}>Dashboard</h1>
        <p style={{ color:'#64748b',fontSize:14,margin:0 }}>Overview of your support bot performance</p>
      </div>

      {loading ? (
        <div style={{ color:'#64748b',textAlign:'center',padding:60 }}>Loading dashboard...</div>
      ) : (
        <>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginBottom:28 }}>
            <StatCard icon={MessageSquare} label="Total Conversations" value={data?.total_conversations} color="#6366f1" />
            <StatCard icon={TrendingUp} label="Total Messages" value={data?.total_messages} color="#22c55e" sub={`${data?.recent_messages_7d} this week`} />
            <StatCard icon={FileText} label="Documents" value={data?.total_documents} color="#f59e0b" />
            <StatCard icon={ThumbsUp} label="Positive Feedback" value={data?.positive_feedback} color="#22c55e" />
            <StatCard icon={AlertTriangle} label="Flagged Messages" value={data?.flagged_messages} color="#ef4444" />
            <StatCard icon={Percent} label="Avg Confidence" value={data?.avg_confidence ? `${data.avg_confidence}%` : '—'} color="#8b5cf6" />
          </div>

          <div style={{ background:'#1e293b',border:'1px solid #334155',borderRadius:12,padding:24 }}>
            <h2 style={{ color:'#f1f5f9',fontSize:16,fontWeight:600,margin:'0 0 20px' }}>Messages – Last 7 Days</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#475569" fontSize={12} />
                  <YAxis stroke="#475569" fontSize={12} />
                  <Tooltip contentStyle={{ background:'#0f172a',border:'1px solid #334155',borderRadius:8,color:'#f1f5f9' }} />
                  <Line type="monotone" dataKey="messages" stroke="#6366f1" strokeWidth={2} dot={{ fill:'#6366f1' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign:'center',color:'#475569',padding:40 }}>No data yet – start chatting to see stats</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
