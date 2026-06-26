from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, documents, chat, analytics
import uvicorn

app = FastAPI(title="AI Customer Support Bot", version="1.0.0")

# ✅ FIX: allow Vite frontend (5173) + optional production origins
origins = [
    "http://localhost:5173",  # Vite React frontend
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])

@app.get("/")
def root():
    return {
        "message": "AI Customer Support Bot API",
        "status": "running"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)