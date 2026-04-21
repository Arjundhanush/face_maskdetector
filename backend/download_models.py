"""
Download model files required for face mask detection.
Called during Render build step to ensure models are available.
"""

import os
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)

# ---- Face Detector (OpenCV SSD) ----
FACE_DETECTOR_DIR = os.path.join(PARENT_DIR, "face_detector")
os.makedirs(FACE_DETECTOR_DIR, exist_ok=True)

files = {
    "deploy.prototxt": "https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt",
    "res10_300x300_ssd_iter_140000.caffemodel": "https://raw.githubusercontent.com/opencv/opencv_3rdparty/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel",
}

for filename, url in files.items():
    filepath = os.path.join(FACE_DETECTOR_DIR, filename)
    if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
        print(f"[SKIP] {filename} already exists")
    else:
        print(f"[DOWNLOADING] {filename} ...")
        urllib.request.urlretrieve(url, filepath)
        size_mb = os.path.getsize(filepath) / (1024 * 1024)
        print(f"[DONE] {filename} ({size_mb:.1f} MB)")

# ---- Mask Detector Model ----
MODEL_DIR = os.path.join(PARENT_DIR, "model")
model_path = os.path.join(MODEL_DIR, "mask_detector.keras")

if os.path.exists(model_path) and os.path.getsize(model_path) > 0:
    print(f"[SKIP] mask_detector.keras already exists")
else:
    print(f"[WARNING] mask_detector.keras not found at {model_path}")
    print(f"[WARNING] Please ensure the trained model is committed to the repository")
    print(f"[WARNING] or provide a download URL for the model file")

print("\n✅ Model download check complete!")
