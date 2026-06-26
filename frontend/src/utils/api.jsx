import axios from 'axios';

// Vite environment variable
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => {
    const form = new FormData();
    form.append('username', email);
    form.append('password', password);

    return api.post('/auth/login', form);
  },

  register: (data) => api.post('/auth/register', data),

  me: () => api.get('/auth/me'),
};

export const chatAPI = {
  ask: (question, session_id) =>
    api.post('/chat/ask', {
      question,
      session_id,
    }),

  feedback: (conversation_id, message_id, rating) =>
    api.post('/chat/feedback', {
      conversation_id,
      message_id,
      rating,
    }),

  conversations: () => api.get('/chat/conversations'),

  conversation: (id) =>
    api.get(`/chat/conversations/${id}`),

  suggestedQuestions: () =>
    api.get('/chat/suggested-questions'),
};

export const documentsAPI = {
  upload: (file) => {
    const form = new FormData();
    form.append('file', file);

    return api.post('/documents/upload', form, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  list: () => api.get('/documents/'),

  delete: (id) => api.delete(`/documents/${id}`),
};

export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard'),

  flagged: () => api.get('/analytics/flagged'),

  knowledgeGaps: () => api.get('/analytics/knowledge-gaps'),
};

export default api;

