"""
Face Shield AI — Backend Server
FastAPI application with WebSocket for live detection,
REST API for image upload & history, and MongoDB persistence.
"""

import cv2
import numpy as np
import base64
import time
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from tensorflow.keras.models import load_model

from database import connect_db, close_db, save_detection, get_detections, get_stats, get_detection_by_id, delete_detection

# --- Model Paths ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
prototxtPath = os.path.join(BASE_DIR, "face_detector", "deploy.prototxt")
weightsPath = os.path.join(BASE_DIR, "face_detector", "res10_300x300_ssd_iter_140000.caffemodel")

faceNet = None
mask_model = None


def load_models():
    """Load the face detector and mask classifier models."""
    global faceNet, mask_model
    faceNet = cv2.dnn.readNet(prototxtPath, weightsPath)
    mask_model = load_model(os.path.join(BASE_DIR, "model", "mask_detector.keras"))
    print("[MODEL] Face detector and mask classifier loaded successfully")


def detect_faces_and_masks(frame):
    """
    Run face detection + mask classification on a single frame.
    Returns a list of detection result dicts.
    """
    h, w = frame.shape[:2]
    blob = cv2.dnn.blobFromImage(frame, 1.0, (300, 300), (104.0, 177.0, 123.0))
    faceNet.setInput(blob)
    detections = faceNet.forward()

    results = []

    for i in range(detections.shape[2]):
        confidence = detections[0, 0, i, 2]

        if confidence > 0.5:
            box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
            (startX, startY, endX, endY) = box.astype("int")
            (startX, startY) = (max(0, startX), max(0, startY))
            (endX, endY) = (min(w - 1, endX), min(h - 1, endY))

            face = frame[startY:endY, startX:endX]

            if face.shape[0] == 0 or face.shape[1] == 0:
                continue

            face_input = cv2.resize(face, (224, 224))
            face_input = face_input / 255.0
            face_input = np.reshape(face_input, (1, 224, 224, 3))

            pred = mask_model.predict(face_input, verbose=0)[0][0]

            if pred < 0.2:
                label = "Mask"
                color = "#10b981"
            elif pred > 0.8:
                label = "No Mask"
                color = "#ef4444"
            else:
                label = "Uncertain"
                color = "#eab308"

            results.append({
                "box": [int(startX), int(startY), int(endX - startX), int(endY - startY)],
                "label": label,
                "color": color,
                "confidence": float(confidence),
                "pred": float(pred)
            })

    return results


def create_thumbnail(frame, max_size=120):
    """Create a small base64 JPEG thumbnail from a frame."""
    h, w = frame.shape[:2]
    scale = max_size / max(h, w)
    thumb = cv2.resize(frame, (int(w * scale), int(h * scale)))
    _, buffer = cv2.imencode('.jpg', thumb, [cv2.IMWRITE_JPEG_QUALITY, 60])
    return base64.b64encode(buffer).decode('utf-8')


# --- App Lifecycle ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    load_models()
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="Face Shield AI",
    description="Real-time face mask detection API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===================== REST API Endpoints =====================

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "models_loaded": faceNet is not None and mask_model is not None,
    }


@app.post("/api/detect-image")
async def detect_image(file: UploadFile = File(...)):
    """
    Accept an image upload, run face mask detection,
    save results to MongoDB, and return detections.
    """
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        return JSONResponse(
            status_code=400,
            content={"error": "Could not decode image. Please upload a valid image file."},
        )

    results = detect_faces_and_masks(frame)

    # Count labels
    mask_count = sum(1 for r in results if r["label"] == "Mask")
    no_mask_count = sum(1 for r in results if r["label"] == "No Mask")
    uncertain_count = sum(1 for r in results if r["label"] == "Uncertain")

    # Create thumbnail
    thumbnail = create_thumbnail(frame)

    # Save to DB
    detection_id = await save_detection(
        num_faces=len(results),
        mask_count=mask_count,
        no_mask_count=no_mask_count,
        uncertain_count=uncertain_count,
        source="upload",
        thumbnail=thumbnail,
        details=results,
    )

    # Encode annotated image to return
    for det in results:
        box = det["box"]
        x, y, w, h = box
        bgr_color = tuple(int(det["color"].lstrip('#')[i:i+2], 16) for i in (4, 2, 0))
        cv2.rectangle(frame, (x, y), (x + w, y + h), bgr_color, 2)
        cv2.putText(frame, det["label"], (x, y - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, bgr_color, 2)

    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    annotated_b64 = base64.b64encode(buffer).decode('utf-8')

    return {
        "id": detection_id,
        "detections": results,
        "annotated_image": f"data:image/jpeg;base64,{annotated_b64}",
        "summary": {
            "total_faces": len(results),
            "mask": mask_count,
            "no_mask": no_mask_count,
            "uncertain": uncertain_count,
        },
    }


@app.get("/api/detections")
async def list_detections(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    source: str = Query(None),
    days: int = Query(None, ge=1),
):
    """Fetch paginated detection history."""
    return await get_detections(page=page, limit=limit, source=source, days=days)


@app.get("/api/detections/{detection_id}")
async def get_single_detection(detection_id: str):
    """Fetch a single detection by ID."""
    doc = await get_detection_by_id(detection_id)
    if not doc:
        return JSONResponse(status_code=404, content={"error": "Detection not found"})
    return doc


@app.delete("/api/detections/{detection_id}")
async def remove_detection(detection_id: str):
    """Delete a detection record."""
    success = await delete_detection(detection_id)
    if not success:
        return JSONResponse(status_code=404, content={"error": "Detection not found"})
    return {"message": "Detection deleted"}


@app.get("/api/stats")
async def dashboard_stats():
    """Get aggregated stats for the dashboard."""
    return await get_stats()


# ===================== WebSocket Endpoint =====================

@app.websocket("/ws/detect")
async def websocket_endpoint(websocket: WebSocket):
    """
    Real-time face mask detection via WebSocket.
    Receives base64 frames, returns detection JSON.
    Saves to DB every ~5 seconds (throttled).
    """
    await websocket.accept()
    last_save_time = 0
    save_interval = 5  # seconds

    try:
        while True:
            data = await websocket.receive_text()
            if "," in data:
                encoded_data = data.split(',')[1]
            else:
                encoded_data = data

            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is None:
                continue

            results = detect_faces_and_masks(frame)

            # Throttled save to DB
            current_time = time.time()
            if results and (current_time - last_save_time) >= save_interval:
                mask_count = sum(1 for r in results if r["label"] == "Mask")
                no_mask_count = sum(1 for r in results if r["label"] == "No Mask")
                uncertain_count = sum(1 for r in results if r["label"] == "Uncertain")
                thumbnail = create_thumbnail(frame)

                await save_detection(
                    num_faces=len(results),
                    mask_count=mask_count,
                    no_mask_count=no_mask_count,
                    uncertain_count=uncertain_count,
                    source="webcam",
                    thumbnail=thumbnail,
                    details=results,
                )
                last_save_time = current_time

            await websocket.send_json(results)

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error processing frame: {e}")
