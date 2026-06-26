from fastapi import APIRouter, Depends
from config import db
from routers.auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    total_conversations = await db.conversations.count_documents({})
    total_messages = await db.messages.count_documents({})
    total_documents = await db.documents.count_documents({})
    flagged_messages = await db.messages.count_documents({"flagged": True})
    
    positive_feedback = await db.messages.count_documents({"feedback": 1})
    negative_feedback = await db.messages.count_documents({"feedback": -1})
    
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_messages = await db.messages.count_documents({"timestamp": {"$gte": week_ago}})
    
    pipeline = [
        {"$match": {"timestamp": {"$gte": week_ago}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    daily_messages = await db.messages.aggregate(pipeline).to_list(7)
    
    avg_confidence_pipeline = [
        {"$group": {"_id": None, "avg": {"$avg": "$confidence"}}}
    ]
    avg_conf = await db.messages.aggregate(avg_confidence_pipeline).to_list(1)
    avg_confidence = avg_conf[0]["avg"] if avg_conf else 0
    
    return {
        "total_conversations": total_conversations,
        "total_messages": total_messages,
        "total_documents": total_documents,
        "flagged_messages": flagged_messages,
        "positive_feedback": positive_feedback,
        "negative_feedback": negative_feedback,
        "recent_messages_7d": recent_messages,
        "avg_confidence": round(avg_confidence * 100, 1),
        "daily_messages": daily_messages
    }

@router.get("/flagged")
async def get_flagged_messages(current_user: dict = Depends(get_current_user)):
    flagged = await db.messages.find({"flagged": True}).sort("timestamp", -1).to_list(50)
    for m in flagged:
        m["_id"] = str(m["_id"])
        m["timestamp"] = m["timestamp"].isoformat()
    return flagged

@router.get("/knowledge-gaps")
async def get_knowledge_gaps(current_user: dict = Depends(get_current_user)):
    low_conf = await db.messages.find(
        {"confidence": {"$lt": 0.4}}
    ).sort("timestamp", -1).to_list(20)
    for m in low_conf:
        m["_id"] = str(m["_id"])
        m["timestamp"] = m["timestamp"].isoformat()
    return low_conf
