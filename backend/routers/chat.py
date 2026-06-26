from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from config import db
from services.ai_service import answer_question
from bson import ObjectId
from typing import Optional

router = APIRouter()

class ChatMessage(BaseModel):
    question: str
    session_id: Optional[str] = None

class FeedbackRequest(BaseModel):
    conversation_id: str
    message_id: str
    rating: int  # 1 for thumbs up, -1 for thumbs down

@router.post("/ask")
async def ask_question(message: ChatMessage):
    if not message.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    result = await answer_question(message.question)
    
    if not message.session_id:
        session = {
            "created_at": datetime.utcnow(),
            "messages": [],
            "status": "active"
        }
        session_result = await db.conversations.insert_one(session)
        session_id = str(session_result.inserted_id)
    else:
        session_id = message.session_id
    
    msg_doc = {
        "session_id": session_id,
        "question": message.question,
        "answer": result["answer"],
        "sources": result["sources"],
        "confidence": result["confidence"],
        "flagged": result["confidence"] < 0.4,
        "timestamp": datetime.utcnow(),
        "feedback": None
    }
    msg_result = await db.messages.insert_one(msg_doc)
    
    await db.conversations.update_one(
        {"_id": ObjectId(session_id)},
        {
            "$push": {"messages": str(msg_result.inserted_id)},
            "$set": {"last_message": datetime.utcnow()}
        }
    )
    
    return {
        "session_id": session_id,
        "message_id": str(msg_result.inserted_id),
        "answer": result["answer"],
        "sources": result["sources"],
        "confidence": result["confidence"]
    }

@router.post("/feedback")
async def submit_feedback(feedback: FeedbackRequest):
    result = await db.messages.update_one(
        {"_id": ObjectId(feedback.message_id)},
        {"$set": {"feedback": feedback.rating}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Feedback recorded"}

@router.get("/conversations")
async def list_conversations():
    convs = await db.conversations.find().sort("last_message", -1).to_list(50)
    for c in convs:
        c["_id"] = str(c["_id"])
        msg_count = await db.messages.count_documents({"session_id": c["_id"]})
        c["message_count"] = msg_count
    return convs

@router.get("/conversations/{session_id}")
async def get_conversation(session_id: str):
    messages = await db.messages.find({"session_id": session_id}).sort("timestamp", 1).to_list(200)
    for m in messages:
        m["_id"] = str(m["_id"])
        m["timestamp"] = m["timestamp"].isoformat()
    return messages

@router.get("/suggested-questions")
async def get_suggested_questions():
    questions = [
        "How do I reset my password?",
        "What is the refund policy?",
        "How do I contact support?",
        "How do I export my data?",
        "What payment methods are accepted?"
    ]
    return {"questions": questions}
