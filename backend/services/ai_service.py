import faiss
import numpy as np
import pickle
import os
from sentence_transformers import SentenceTransformer
from transformers import pipeline as hf_pipeline
import fitz  # PyMuPDF
from config import db, settings
import asyncio
from datetime import datetime

# Global state
_embedding_model = None
_qa_model = None
_faiss_index = None
_chunks_store = []  # List of {text, doc_id, doc_name, chunk_id}

FAISS_INDEX_PATH = "./faiss_index.pkl"

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model

def get_qa_model():
    global _qa_model
    if _qa_model is None:
        _qa_model = hf_pipeline(
            "question-answering",
            model="deepset/roberta-base-squad2"
        )
    return _qa_model

def get_faiss_index():
    global _faiss_index, _chunks_store
    if _faiss_index is None:
        if os.path.exists(FAISS_INDEX_PATH):
            with open(FAISS_INDEX_PATH, "rb") as f:
                data = pickle.load(f)
                _faiss_index = data["index"]
                _chunks_store = data["chunks"]
        else:
            _faiss_index = faiss.IndexFlatIP(384)  # Inner product for cosine similarity
            _chunks_store = []
    return _faiss_index, _chunks_store

def save_faiss_index():
    index, chunks = get_faiss_index()
    with open(FAISS_INDEX_PATH, "wb") as f:
        pickle.dump({"index": index, "chunks": chunks}, f)

def extract_text_from_pdf(file_path: str) -> str:
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def extract_text_from_txt(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()

def split_into_chunks(text: str, chunk_size: int = 500, overlap: int = 50) -> list:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if len(chunk.strip()) > 50:
            chunks.append(chunk)
    return chunks

async def process_document(file_path: str, doc_id: str, file_type: str) -> int:
    if file_type == "application/pdf":
        text = extract_text_from_pdf(file_path)
    else:
        text = extract_text_from_txt(file_path)
    
    if not text.strip():
        raise ValueError("No text content found in document")
    
    chunks = split_into_chunks(text)
    
    model = get_embedding_model()
    embeddings = model.encode(chunks, normalize_embeddings=True)
    
    index, chunks_store = get_faiss_index()
    
    start_idx = index.ntotal
    index.add(np.array(embeddings, dtype=np.float32))
    
    doc = await db.documents.find_one({"_id": __import__("bson").ObjectId(doc_id)})
    doc_name = doc["filename"] if doc else "Unknown"
    
    for i, chunk in enumerate(chunks):
        chunks_store.append({
            "text": chunk,
            "doc_id": doc_id,
            "doc_name": doc_name,
            "chunk_id": start_idx + i,
            "chunk_index": i
        })
    
    save_faiss_index()
    return len(chunks)

async def delete_document_chunks(doc_id: str):
    global _faiss_index, _chunks_store
    
    index, chunks = get_faiss_index()
    
    remaining_chunks = [c for c in chunks if c["doc_id"] != doc_id]
    
    if remaining_chunks:
        model = get_embedding_model()
        texts = [c["text"] for c in remaining_chunks]
        embeddings = model.encode(texts, normalize_embeddings=True)
        
        new_index = faiss.IndexFlatIP(384)
        new_index.add(np.array(embeddings, dtype=np.float32))
        
        for i, chunk in enumerate(remaining_chunks):
            chunk["chunk_id"] = i
        
        _faiss_index = new_index
        _chunks_store = remaining_chunks
    else:
        _faiss_index = faiss.IndexFlatIP(384)
        _chunks_store = []
    
    save_faiss_index()

async def answer_question(question: str) -> dict:
    index, chunks_store = get_faiss_index()
    
    if index.ntotal == 0:
        return {
            "answer": "No documents have been uploaded yet. Please ask your administrator to upload relevant documentation.",
            "sources": [],
            "confidence": 0.0
        }
    
    model = get_embedding_model()
    question_embedding = model.encode([question], normalize_embeddings=True)
    
    k = min(5, index.ntotal)
    scores, indices = index.search(np.array(question_embedding, dtype=np.float32), k)
    
    relevant_chunks = []
    seen_docs = set()
    for score, idx in zip(scores[0], indices[0]):
        if idx < len(chunks_store) and score > 0.2:
            chunk = chunks_store[idx]
            relevant_chunks.append({"text": chunk["text"], "score": float(score), "doc_name": chunk["doc_name"], "doc_id": chunk["doc_id"]})
            seen_docs.add(chunk["doc_name"])
    
    if not relevant_chunks:
        return {
            "answer": "I couldn't find relevant information in the uploaded documents to answer your question. Please try rephrasing or contact support.",
            "sources": [],
            "confidence": 0.1
        }
    
    context = " ".join([c["text"] for c in relevant_chunks[:3]])
    
    try:
        qa = get_qa_model()
        result = qa(question=question, context=context[:2000], max_answer_len=200)
        answer = result["answer"]
        confidence = float(result["score"])
    except Exception:
        # Fallback: return most relevant chunk
        answer = relevant_chunks[0]["text"][:500]
        confidence = float(relevant_chunks[0]["score"]) * 0.5
    
    sources = list({c["doc_name"]: {"doc_name": c["doc_name"], "doc_id": c["doc_id"]} for c in relevant_chunks}.values())
    
    return {
        "answer": answer,
        "sources": sources[:3],
        "confidence": min(confidence, 1.0)
    }
