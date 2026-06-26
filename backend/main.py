"""
AI Customer Support Bot - FastAPI Backend
RAG Pipeline: PDF → Chunks → Embeddings → FAISS → QA
"""

import os
import json
import time
import pickle
import hashlib
import logging
from pathlib import Path
from typing import Optional

import numpy as np
import faiss
import torch
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer
from transformers import pipeline

# ─────────────────────────────────────────────
# Config & Logging
# ─────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

UPLOAD_DIR   = Path("uploads")
STORE_DIR    = Path("vectorstore")
CHUNK_SIZE   = 500          # characters per chunk
CHUNK_OVERLAP = 50          # overlap between chunks
TOP_K        = 3            # number of chunks to retrieve
EMBED_MODEL  = "all-MiniLM-L6-v2"
QA_MODEL     = "deepset/roberta-base-squad2"

UPLOAD_DIR.mkdir(exist_ok=True)
STORE_DIR.mkdir(exist_ok=True)

# ─────────────────────────────────────────────
# App
# ─────────────────────────────────────────────
app = FastAPI(title="AI Support Bot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Global State (loaded once at startup)
# ─────────────────────────────────────────────
class VectorStore:
    def __init__(self):
        self.index:   Optional[faiss.IndexFlatL2] = None
        self.chunks:  list[str]  = []
        self.sources: list[str]  = []  # filename per chunk
        self.dim:     int        = 384  # MiniLM embedding dim

state = VectorStore()

# ─────────────────────────────────────────────
# Model Loading (lazy, cached)
# ─────────────────────────────────────────────
_embedder = None
_qa       = None

def get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        log.info("Loading embedding model …")
        _embedder = SentenceTransformer(EMBED_MODEL)
    return _embedder

def get_qa():
    global _qa
    if _qa is None:
        log.info("Loading QA model …")
        _qa = pipeline("question-answering", model=QA_MODEL, tokenizer=QA_MODEL)
    return _qa

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def extract_text_from_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    texts  = []
    for page in reader.pages:
        t = page.extract_text()
        if t:
            texts.append(t.strip())
    return "\n".join(texts)

def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    chunks = []
    start  = 0
    while start < len(text):
        end = min(start + size, len(text))
        chunks.append(text[start:end].strip())
        start += size - overlap
    return [c for c in chunks if len(c) > 30]  # skip tiny fragments

def embed(texts: list[str]) -> np.ndarray:
    return get_embedder().encode(texts, convert_to_numpy=True, show_progress_bar=False)

def save_store():
    with open(STORE_DIR / "chunks.pkl",  "wb") as f:
        pickle.dump(state.chunks,  f)
    with open(STORE_DIR / "sources.pkl", "wb") as f:
        pickle.dump(state.sources, f)
    if state.index is not None:
        faiss.write_index(state.index, str(STORE_DIR / "index.faiss"))
    log.info("Vector store saved (%d chunks)", len(state.chunks))

def load_store():
    idx_path = STORE_DIR / "index.faiss"
    chk_path = STORE_DIR / "chunks.pkl"
    src_path = STORE_DIR / "sources.pkl"
    if idx_path.exists() and chk_path.exists() and src_path.exists():
        state.index   = faiss.read_index(str(idx_path))
        with open(chk_path,  "rb") as f: state.chunks  = pickle.load(f)
        with open(src_path,  "rb") as f: state.sources = pickle.load(f)
        log.info("Vector store loaded (%d chunks)", len(state.chunks))

# ─────────────────────────────────────────────
# Startup
# ─────────────────────────────────────────────
@app.on_event("startup")
def startup():
    load_store()
    # warm up models in background thread would be ideal; for simplicity load here
    try:
        get_embedder()
        get_qa()
    except Exception as e:
        log.warning("Model pre-load failed (will retry on first request): %s", e)

# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────
class QuestionRequest(BaseModel):
    question: str

class AnswerResponse(BaseModel):
    answer:     str
    confidence: float          # 0-1
    sources:    list[str]
    context:    str

class UploadResponse(BaseModel):
    filename:    str
    chunks_added: int
    total_chunks: int
    message:     str

class StatusResponse(BaseModel):
    total_chunks:    int
    documents:       list[str]
    model_ready:     bool

# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────
@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "message": "AI Support Bot API"}

@app.get("/status", response_model=StatusResponse, tags=["admin"])
def status():
    unique_sources = list(set(state.sources)) if state.sources else []
    return StatusResponse(
        total_chunks  = len(state.chunks),
        documents     = unique_sources,
        model_ready   = _embedder is not None and _qa is not None,
    )

@app.post("/upload", response_model=UploadResponse, tags=["admin"])
async def upload_document(file: UploadFile = File(...)):
    """Upload a PDF, extract text, chunk it, embed it, add to FAISS index."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Save file
    save_path = UPLOAD_DIR / file.filename
    content   = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    # Extract + chunk
    try:
        text   = extract_text_from_pdf(save_path)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not read PDF: {e}")

    if not text.strip():
        raise HTTPException(status_code=422, detail="PDF appears to have no extractable text (scanned images not supported).")

    chunks = chunk_text(text)
    if not chunks:
        raise HTTPException(status_code=422, detail="No usable text chunks found.")

    # Embed
    vectors = embed(chunks).astype("float32")

    # Add to FAISS index
    if state.index is None:
        state.index = faiss.IndexFlatL2(state.dim)

    state.index.add(vectors)
    state.chunks.extend(chunks)
    state.sources.extend([file.filename] * len(chunks))

    save_store()

    return UploadResponse(
        filename     = file.filename,
        chunks_added = len(chunks),
        total_chunks = len(state.chunks),
        message      = f"Successfully indexed {len(chunks)} chunks from '{file.filename}'.",
    )

@app.post("/ask", response_model=AnswerResponse, tags=["chat"])
def ask(req: QuestionRequest):
    """Retrieve relevant chunks via FAISS and answer with the QA model."""
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if state.index is None or len(state.chunks) == 0:
        raise HTTPException(
            status_code=404,
            detail="No documents indexed yet. Please upload a PDF from the Admin panel.",
        )

    # Embed the question
    q_vec = embed([req.question]).astype("float32")

    # FAISS search
    k     = min(TOP_K, len(state.chunks))
    dists, idxs = state.index.search(q_vec, k)

    retrieved_chunks   = [state.chunks[i]  for i in idxs[0] if i < len(state.chunks)]
    retrieved_sources  = [state.sources[i] for i in idxs[0] if i < len(state.sources)]

    if not retrieved_chunks:
        raise HTTPException(status_code=404, detail="Could not find relevant content.")

    # Build context from top-k chunks
    context = "\n\n---\n\n".join(retrieved_chunks)

    # QA inference
    try:
        result = get_qa()(question=req.question, context=context)
    except Exception as e:
        log.error("QA model error: %s", e)
        raise HTTPException(status_code=500, detail=f"QA model error: {e}")

    answer     = result.get("answer", "I could not find a specific answer.")
    confidence = round(float(result.get("score", 0.0)), 4)

    # Unique source filenames
    unique_sources = list(dict.fromkeys(retrieved_sources))

    return AnswerResponse(
        answer     = answer,
        confidence = confidence,
        sources    = unique_sources,
        context    = retrieved_chunks[0],   # most relevant chunk preview
    )

@app.delete("/reset", tags=["admin"])
def reset_store():
    """Clear all indexed documents."""
    state.index   = None
    state.chunks  = []
    state.sources = []
    for p in STORE_DIR.iterdir():
        p.unlink(missing_ok=True)
    return {"message": "Vector store cleared."}