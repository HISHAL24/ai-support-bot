import React, { useState, useEffect, useRef } from 'react';
import { documentsAPI } from '../utils/api';
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';

const STATUS_CONFIG = {
  ready: { color: '#22c55e', icon: CheckCircle, label: 'Ready' },
  processing: { color: '#f59e0b', icon: Clock, label: 'Processing' },
  failed: { color: '#ef4444', icon: AlertCircle, label: 'Failed' },
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const fetchDocs = async () => {
    try {
      const res = await documentsAPI.list();
      setDocs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleUpload = async (files) => {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    try {
      await documentsAPI.upload(file);
      await fetchDocs();
    } catch (e) {
      alert(e.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await documentsAPI.delete(id);
      setDocs(prev => prev.filter(d => d._id !== id));
    } catch {
      alert('Delete failed');
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    return bytes < 1024 * 1024 ? `${(bytes/1024).toFixed(1)} KB` : `${(bytes/1024/1024).toFixed(1)} MB`;
  };

  return (
    <div style={{ padding:32 }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28 }}>
        <div>
          <h1 style={{ color:'#f1f5f9',fontSize:22,fontWeight:700,margin:'0 0 4px' }}>Knowledge Base</h1>
          <p style={{ color:'#64748b',fontSize:14,margin:0 }}>Upload PDF or TXT documents for the AI to learn from</p>
        </div>
        <button onClick={fetchDocs} style={{ background:'transparent',border:'1px solid #334155',borderRadius:8,padding:'8px 14px',color:'#64748b',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:13 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
        onClick={() => fileRef.current.click()}
        style={{ border:`2px dashed ${dragOver ? '#6366f1' : '#334155'}`,borderRadius:12,padding:40,textAlign:'center',cursor:'pointer',marginBottom:24,background: dragOver ? '#6366f108' : 'transparent',transition:'all 0.2s' }}>
        <input ref={fileRef} type="file" accept=".pdf,.txt" style={{ display:'none' }} onChange={e => handleUpload(e.target.files)} />
        {uploading ? (
          <div style={{ color:'#6366f1',display:'flex',flexDirection:'column',alignItems:'center',gap:8 }}>
            <div style={{ width:40,height:40,border:'3px solid #6366f130',borderTop:'3px solid #6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} />
            <span style={{ fontSize:14 }}>Processing document...</span>
          </div>
        ) : (
          <>
            <Upload size={32} color={dragOver ? '#6366f1' : '#475569'} style={{ margin:'0 auto 12px' }} />
            <div style={{ color:'#94a3b8',fontSize:15,marginBottom:4 }}>Drop a file here or click to upload</div>
            <div style={{ color:'#475569',fontSize:13 }}>Supports PDF and TXT · Max 50MB</div>
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Documents List */}
      {loading ? (
        <div style={{ color:'#64748b',textAlign:'center',padding:40 }}>Loading...</div>
      ) : docs.length === 0 ? (
        <div style={{ background:'#1e293b',border:'1px solid #334155',borderRadius:12,padding:48,textAlign:'center' }}>
          <FileText size={40} color="#334155" style={{ margin:'0 auto 12px' }} />
          <div style={{ color:'#64748b',fontSize:15 }}>No documents uploaded yet</div>
          <div style={{ color:'#475569',fontSize:13,marginTop:4 }}>Upload your first document to get started</div>
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {docs.map(doc => {
            const status = STATUS_CONFIG[doc.status] || STATUS_CONFIG.processing;
            const StatusIcon = status.icon;
            return (
              <div key={doc._id} style={{ background:'#1e293b',border:'1px solid #334155',borderRadius:12,padding:'16px 20px',display:'flex',alignItems:'center',gap:16 }}>
                <div style={{ width:40,height:40,borderRadius:10,background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <FileText size={20} color="#6366f1" />
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ color:'#f1f5f9',fontSize:14,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{doc.filename}</div>
                  <div style={{ display:'flex',alignItems:'center',gap:12,marginTop:4 }}>
                    <span style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:12,color:status.color }}>
                      <StatusIcon size={12} /> {status.label}
                    </span>
                    {doc.chunks_count > 0 && <span style={{ color:'#475569',fontSize:12 }}>{doc.chunks_count} chunks</span>}
                    <span style={{ color:'#475569',fontSize:12 }}>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(doc._id, doc.filename)}
                  style={{ background:'transparent',border:'1px solid #334155',borderRadius:8,padding:'6px 10px',cursor:'pointer',color:'#64748b',display:'flex',alignItems:'center',gap:4,fontSize:12 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
