import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import ChatPage from './pages/ChatPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import AdminLayout from './pages/AdminLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import DocumentsPage from './pages/DocumentsPage.jsx';
import ConversationsPage from './pages/ConversationsPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0f172a',color:'#94a3b8' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="conversations" element={<ConversationsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
