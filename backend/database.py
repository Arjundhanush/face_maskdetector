"""
MongoDB database module for Face Shield AI.
Handles connection management and CRUD operations for detection logs.
"""

import os
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# --- Configuration ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "faceshield")

# --- Connection ---
client: AsyncIOMotorClient = None
db = None


async def connect_db():
    """Initialize MongoDB connection and create indexes."""
    global client, db
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    # Create indexes for efficient querying
    await db.detections.create_index("timestamp")
    await db.detections.create_index("source")
    print(f"[DB] Connected to MongoDB: {MONGO_URI}/{DB_NAME}")


async def close_db():
    """Close the MongoDB connection."""
    global client
    if client:
        client.close()
        print("[DB] MongoDB connection closed")


# --- Helper ---
def _serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document to JSON-serializable dict."""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc


# --- CRUD Operations ---

async def save_detection(
    num_faces: int,
    mask_count: int,
    no_mask_count: int,
    uncertain_count: int,
    source: str = "webcam",
    thumbnail: str = None,
    details: list = None,
) -> str:
    """
    Save a detection result to MongoDB.
    Returns the inserted document ID as string.
    """
    doc = {
        "timestamp": datetime.now(timezone.utc),
        "num_faces": num_faces,
        "mask_count": mask_count,
        "no_mask_count": no_mask_count,
        "uncertain_count": uncertain_count,
        "source": source,
        "thumbnail": thumbnail,
        "details": details or [],
    }
    result = await db.detections.insert_one(doc)
    return str(result.inserted_id)


async def get_detections(
    page: int = 1,
    limit: int = 20,
    source: str = None,
    days: int = None,
) -> dict:
    """
    Fetch paginated detection history.
    Returns dict with 'items', 'total', 'page', 'pages'.
    """
    query = {}
    if source:
        query["source"] = source
    if days:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        query["timestamp"] = {"$gte": cutoff}

    total = await db.detections.count_documents(query)
    pages = max(1, (total + limit - 1) // limit)
    skip = (page - 1) * limit

    cursor = db.detections.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    items = []
    async for doc in cursor:
        items.append(_serialize_doc(doc))

    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": pages,
    }


async def get_stats() -> dict:
    """
    Aggregate detection statistics for the dashboard.
    Returns totals, compliance rate, and daily trend data.
    """
    # Overall totals
    pipeline_totals = [
        {
            "$group": {
                "_id": None,
                "total_scans": {"$sum": 1},
                "total_faces": {"$sum": "$num_faces"},
                "total_mask": {"$sum": "$mask_count"},
                "total_no_mask": {"$sum": "$no_mask_count"},
                "total_uncertain": {"$sum": "$uncertain_count"},
            }
        }
    ]
    totals_cursor = db.detections.aggregate(pipeline_totals)
    totals = None
    async for doc in totals_cursor:
        totals = doc

    if not totals:
        totals = {
            "total_scans": 0,
            "total_faces": 0,
            "total_mask": 0,
            "total_no_mask": 0,
            "total_uncertain": 0,
        }
    totals.pop("_id", None)

    # Compliance rate
    total_classified = totals["total_mask"] + totals["total_no_mask"]
    totals["compliance_rate"] = (
        round(totals["total_mask"] / total_classified * 100, 1)
        if total_classified > 0
        else 0
    )

    # Daily trend (last 7 days)
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    pipeline_trend = [
        {"$match": {"timestamp": {"$gte": seven_days_ago}}},
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}
                },
                "scans": {"$sum": 1},
                "mask": {"$sum": "$mask_count"},
                "no_mask": {"$sum": "$no_mask_count"},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    trend = []
    async for doc in db.detections.aggregate(pipeline_trend):
        trend.append({
            "date": doc["_id"],
            "scans": doc["scans"],
            "mask": doc["mask"],
            "no_mask": doc["no_mask"],
        })

    totals["trend"] = trend
    return totals


async def get_detection_by_id(detection_id: str) -> dict:
    """Fetch a single detection by its ID."""
    try:
        doc = await db.detections.find_one({"_id": ObjectId(detection_id)})
        return _serialize_doc(doc)
    except Exception:
        return None


async def delete_detection(detection_id: str) -> bool:
    """Delete a detection record. Returns True if deleted."""
    try:
        result = await db.detections.delete_one({"_id": ObjectId(detection_id)})
        return result.deleted_count > 0
    except Exception:
        return False
