import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Bot, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // ✅ login returns user + token
      const res = await login(email, password);

      const user = res?.user || res?.data?.user;

      // fallback safety
      const role = user?.role;

      // 🔥 ROLE BASED REDIRECT
      if (role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/chat');
      }

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Login failed. Check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Bot size={28} color="#fff" />
          </div>

          <h1 style={{
            color: '#f1f5f9',
            fontSize: 24,
            fontWeight: 700,
            margin: '0 0 8px'
          }}>
            Admin Portal
          </h1>

          <p style={{
            color: '#64748b',
            fontSize: 14,
            margin: 0
          }}>
            Sign in to manage your support bot
          </p>
        </div>

        <div style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 16,
          padding: 32
        }}>

          {error && (
            <div style={{
              background: '#ef444418',
              border: '1px solid #ef4444',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#ef4444',
              fontSize: 13
            }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* EMAIL */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                color: '#94a3b8',
                fontSize: 13,
                display: 'block',
                marginBottom: 6
              }}>
                Email
              </label>

              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#475569'
                }} />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@company.com"
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 10,
                    padding: '10px 12px 10px 36px',
                    color: '#f1f5f9',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                color: '#94a3b8',
                fontSize: 13,
                display: 'block',
                marginBottom: 6
              }}>
                Password
              </label>

              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#475569'
                }} />

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 10,
                    padding: '10px 12px 10px 36px',
                    color: '#f1f5f9',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '12px',
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* BACK LINK */}
          <div style={{
            marginTop: 20,
            padding: '16px 0 0',
            borderTop: '1px solid #334155',
            textAlign: 'center'
          }}>
            <a
              href="/"
              style={{
                color: '#6366f1',
                fontSize: 13,
                textDecoration: 'none'
              }}
            >
              ← Back to Chat
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
