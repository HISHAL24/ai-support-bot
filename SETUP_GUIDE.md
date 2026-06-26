# AI Customer Support Bot — Complete Setup Guide

## Project Structure

```
ai-support-bot/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── config.py                # Settings + MongoDB connection
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # Environment variables template
│   ├── routers/
│   │   ├── auth.py              # Login / Register / JWT
│   │   ├── documents.py         # Upload / List / Delete docs
│   │   ├── chat.py              # Ask / Feedback / Conversations
│   │   └── analytics.py        # Dashboard / Flagged / Gaps
│   └── services/
│       └── ai_service.py        # RAG pipeline (FAISS + Transformers)
└── frontend/
    ├── package.json
    ├── .env
    └── src/
        ├── App.js               # Router + Auth protection
        ├── index.js
        ├── hooks/
        │   └── useAuth.js       # Auth context + localStorage
        ├── utils/
        │   └── api.js           # Axios API client
        └── pages/
            ├── ChatPage.js      # Customer chat interface
            ├── LoginPage.js     # Admin login
            ├── AdminLayout.js   # Sidebar layout
            ├── DashboardPage.js # Stats + charts
            ├── DocumentsPage.js # Upload + manage docs
            ├── ConversationsPage.js  # View all sessions
            └── AnalyticsPage.js # Feedback + gaps
```

---

## Prerequisites

Install these before starting:

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.10+ | https://python.org |
| Node.js | 18+ | https://nodejs.org |
| MongoDB | 7.0+ | https://mongodb.com/try/download/community |
| Git | any | https://git-scm.com |

---

## Step 1 — Set Up MongoDB

### Option A: Local MongoDB
```bash
# macOS (Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu
sudo apt install mongodb
sudo systemctl start mongodb

# Windows
# Download installer from mongodb.com → Community Server → Install → Run as service
```

### Option B: Free Cloud (MongoDB Atlas)
1. Go to https://mongodb.com/atlas
2. Create free cluster
3. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/`
4. Paste it into `backend/.env` as `MONGODB_URL`

---

## Step 2 — Backend Setup

```bash
# 1. Navigate to backend folder
cd ai-support-bot/backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 4. Copy env file and edit it
cp .env.example .env
# Edit .env → change SECRET_KEY to a random string

# 5. Install dependencies (takes 5–10 min, downloads AI models)
pip install -r requirements.txt

# 6. Start the backend
python main.py
```

✅ Backend is running at: http://localhost:8000  
✅ API docs at: http://localhost:8000/docs

---

## Step 3 — Frontend Setup

Open a **new terminal**:

```bash
# 1. Navigate to frontend folder
cd ai-support-bot/frontend

# 2. Install packages
npm install

# 3. Start development server
npm start
```

✅ Frontend opens at: http://localhost:3000

---

## Step 4 — Create Your Admin Account

```bash
# Using curl:
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"yourpassword","name":"Admin","role":"admin"}'

# Or visit http://localhost:8000/docs → /api/auth/register → Try it out
```

---

## Step 5 — First Time Usage

1. Go to **http://localhost:3000/login**
2. Sign in with your admin credentials
3. Go to **Knowledge Base** → Upload a PDF or TXT file
4. Wait for "Ready" status (processing takes 10–30 seconds)
5. Go to **http://localhost:3000** → Ask a question!

---

## How RAG Works in This Project

```
UPLOAD PHASE:
Document → Extract Text → Split into 500-word chunks
→ Generate embeddings (all-MiniLM-L6-v2)
→ Store in FAISS vector index

QUERY PHASE:
Question → Generate embedding
→ Search FAISS (top 5 similar chunks)
→ Build context from top 3 chunks
→ QA model (roberta-base-squad2) extracts answer
→ Return answer + confidence + source docs
```

---

## API Endpoints Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create admin account |
| POST | /api/auth/login | Login → get JWT token |
| GET | /api/auth/me | Get current user |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/documents/upload | Upload PDF or TXT |
| GET | /api/documents/ | List all documents |
| DELETE | /api/documents/{id} | Delete a document |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/chat/ask | Ask a question |
| POST | /api/chat/feedback | Submit 👍/👎 |
| GET | /api/chat/conversations | List all sessions |
| GET | /api/chat/conversations/{id} | Get session messages |
| GET | /api/chat/suggested-questions | Get quick prompts |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/dashboard | Stats + charts data |
| GET | /api/analytics/flagged | Low-confidence messages |
| GET | /api/analytics/knowledge-gaps | Unanswered topics |

---

## Environment Variables

### backend/.env
```
MONGODB_URL=mongodb://localhost:27017
DB_NAME=ai_support_bot
SECRET_KEY=change-this-to-a-random-64-char-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
UPLOAD_DIR=./uploads
```

### frontend/.env
```
REACT_APP_API_URL=http://localhost:8000/api
```

---

## Troubleshooting

### "ModuleNotFoundError: No module named 'faiss'"
```bash
pip install faiss-cpu
```

### "Cannot connect to MongoDB"
```bash
# Check if MongoDB is running:
mongosh  # should connect
# If not: brew services start mongodb-community (Mac)
```

### Frontend shows CORS error
- Make sure backend is running on port 8000
- Check that `REACT_APP_API_URL` in `.env` is correct
- Restart both servers after changing `.env`

### "No text found in document"
- Ensure your PDF has selectable text (not scanned images)
- For scanned PDFs, consider an OCR step first

### Models download slowly
- First run downloads ~500MB of AI models to `~/.cache/huggingface`
- Subsequent runs load from cache instantly

---

## Production Deployment

### Backend (render.com or Railway)
```bash
# Procfile
web: uvicorn main:app --host 0.0.0.0 --port $PORT

# Set env vars in dashboard:
MONGODB_URL=your_atlas_url
SECRET_KEY=your_production_secret
```

### Frontend (Vercel or Netlify)
```bash
npm run build
# Set REACT_APP_API_URL=https://your-backend-url.com/api
```

---

## Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + React Router | UI + navigation |
| Styling | Inline CSS (no build tools needed) | Consistent dark theme |
| Charts | Recharts | Dashboard visualizations |
| Backend | FastAPI (Python) | REST API |
| Auth | JWT + bcrypt | Secure admin login |
| Database | MongoDB + Motor (async) | Conversations + metadata |
| Embeddings | sentence-transformers (MiniLM) | Text → vectors |
| Vector Search | FAISS | Fast similarity search |
| QA Model | roberta-base-squad2 | Extract answers from context |
| PDF Parsing | PyMuPDF (fitz) | Extract text from PDFs |
