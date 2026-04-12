"""
Download all required files for the face mask detection project:
1. OpenCV face detector prototxt and caffemodel
2. Face mask dataset from Kaggle via kagglehub
"""
import os
import urllib.request
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- 1. Download OpenCV Face Detector model files ---
FACE_DETECTOR_DIR = os.path.join(BASE_DIR, "face_detector")
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

# --- 2. Download Face Mask Dataset via kagglehub ---
print("\n[DATASET] Downloading face mask dataset via kagglehub...")
try:
    import kagglehub
except ImportError:
    print("[INSTALLING] kagglehub...")
    os.system(f"{sys.executable} -m pip install kagglehub -q")
    import kagglehub

dataset_path = kagglehub.dataset_download("omkargurav/face-mask-dataset")
print(f"[DONE] Dataset downloaded to: {dataset_path}")

# --- 3. Copy images into project dataset folder ---
import shutil

src_with = os.path.join(dataset_path, "data", "with_mask")
src_without = os.path.join(dataset_path, "data", "without_mask")

# Fallback: try without 'data' subfolder
if not os.path.isdir(src_with):
    src_with = os.path.join(dataset_path, "with_mask")
    src_without = os.path.join(dataset_path, "without_mask")

# Also try capitalized variants
if not os.path.isdir(src_with):
    # List what's actually in the dataset dir
    print(f"\n[DEBUG] Contents of {dataset_path}:")
    for item in os.listdir(dataset_path):
        full = os.path.join(dataset_path, item)
        if os.path.isdir(full):
            count = len(os.listdir(full))
            print(f"  [DIR]  {item}/ ({count} items)")
            # Check one level deeper
            for sub in os.listdir(full):
                subfull = os.path.join(full, sub)
                if os.path.isdir(subfull):
                    subcount = len(os.listdir(subfull))
                    print(f"    [DIR]  {sub}/ ({subcount} items)")
        else:
            print(f"  [FILE] {item}")
    print("\n[ERROR] Could not locate with_mask / without_mask folders. Check above structure.")
    sys.exit(1)

dst_with = os.path.join(BASE_DIR, "dataset", "withmask")
dst_without = os.path.join(BASE_DIR, "dataset", "withoutmask")

def copy_images(src, dst):
    os.makedirs(dst, exist_ok=True)
    existing = len(os.listdir(dst))
    if existing > 0:
        print(f"  [SKIP] {dst} already has {existing} files")
        return existing
    count = 0
    for f in os.listdir(src):
        src_file = os.path.join(src, f)
        if os.path.isfile(src_file):
            shutil.copy2(src_file, os.path.join(dst, f))
            count += 1
    return count
print(f"\n[COPYING] with_mask -> dataset/withmask")
n1 = copy_images(src_with, dst_with)
print(f"  {n1} images")

print(f"[COPYING] without_mask -> dataset/withoutmask")
n2 = copy_images(src_without, dst_without)
print(f"  {n2} images")

print(f"\n✅ Setup complete! Total: {n1 + n2} images")
