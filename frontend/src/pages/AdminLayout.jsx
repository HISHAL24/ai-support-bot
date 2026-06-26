import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Bot, LayoutDashboard, FileText, MessageSquare, BarChart2, LogOut, ExternalLink } from 'lucide-react';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/documents', icon: FileText, label: 'Knowledge Base' },
  { to: '/admin/conversations', icon: MessageSquare, label: 'Conversations' },
  { to: '/admin/analytics', icon: BarChart2, label: 'Analytics' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display:'flex',minHeight:'100vh',background:'#0f172a',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width:240,background:'#1e293b',borderRight:'1px solid #334155',display:'flex',flexDirection:'column',flexShrink:0 }}>
        <div style={{ padding:'20px 16px',borderBottom:'1px solid #334155' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <div style={{ width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Bot size={20} color="#fff" />
            </div>
            <div>
              <div style={{ color:'#f1f5f9',fontWeight:700,fontSize:14 }}>SupportBot</div>
              <div style={{ color:'#64748b',fontSize:11 }}>Admin Panel</div>
            </div>
          </div>
        </div>

        <nav style={{ flex:1,padding:'16px 8px' }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,marginBottom:4,
              textDecoration:'none',fontSize:14,fontWeight:500,transition:'all 0.15s',
              background: isActive ? '#6366f115' : 'transparent',
              color: isActive ? '#818cf8' : '#94a3b8',
              borderLeft: isActive ? '2px solid #6366f1' : '2px solid transparent',
            })}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
          <a href="/" target="_blank" rel="noreferrer" style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,marginTop:8,textDecoration:'none',fontSize:14,color:'#64748b' }}>
            <ExternalLink size={18} /> View Chat
          </a>
        </nav>

        <div style={{ padding:'16px',borderTop:'1px solid #334155' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10 }}>
            <div style={{ width:32,height:32,borderRadius:'50%',background:'#6366f1',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:13,fontWeight:700 }}>
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <div style={{ color:'#f1f5f9',fontSize:13,fontWeight:600 }}>{user?.name || 'Admin'}</div>
              <div style={{ color:'#64748b',fontSize:11 }}>{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width:'100%',display:'flex',alignItems:'center',gap:8,background:'transparent',border:'1px solid #334155',borderRadius:8,padding:'8px 12px',color:'#64748b',fontSize:13,cursor:'pointer' }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1,overflowY:'auto' }}>
        <Outlet />
      </div>
    </div>
  );
}
