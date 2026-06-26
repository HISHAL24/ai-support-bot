from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from datetime import datetime
from config import db, settings
from routers.auth import get_current_user
from services.ai_service import process_document
from bson import ObjectId
import os, shutil

router = APIRouter()

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    allowed_types = ["application/pdf", "text/plain"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported")
    
    file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    doc = {
        "filename": file.filename,
        "file_path": file_path,
        "file_type": file.content_type,
        "status": "processing",
        "uploaded_by": current_user["_id"],
        "uploaded_at": datetime.utcnow(),
        "chunks_count": 0
    }
    result = await db.documents.insert_one(doc)
    doc_id = str(result.inserted_id)
    
    try:
        chunks_count = await process_document(file_path, doc_id, file.content_type)
        await db.documents.update_one(
            {"_id": result.inserted_id},
            {"$set": {"status": "ready", "chunks_count": chunks_count}}
        )
    except Exception as e:
        await db.documents.update_one(
            {"_id": result.inserted_id},
            {"$set": {"status": "failed", "error": str(e)}}
        )
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    
    return {"id": doc_id, "filename": file.filename, "status": "ready", "chunks_count": chunks_count}

@router.get("/")
async def list_documents(current_user: dict = Depends(get_current_user)):
    docs = await db.documents.find().sort("uploaded_at", -1).to_list(100)
    for doc in docs:
        doc["_id"] = str(doc["_id"])
    return docs

@router.delete("/{doc_id}")
async def delete_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    from services.ai_service import delete_document_chunks
    doc = await db.documents.find_one({"_id": ObjectId(doc_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if os.path.exists(doc["file_path"]):
        os.remove(doc["file_path"])
    
    await delete_document_chunks(doc_id)
    await db.documents.delete_one({"_id": ObjectId(doc_id)})
    return {"message": "Document deleted successfully"}

@router.get("/{doc_id}")
async def get_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"_id": ObjectId(doc_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc["_id"] = str(doc["_id"])
    return doc
