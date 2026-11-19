"""Download Google's pretrained MediaPipe Pose Landmarker Lite task model."""
from pathlib import Path
from urllib.request import urlretrieve
URL='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
DEST=Path(__file__).resolve().parents[1]/'models'/'pose_landmarker_lite.task'
DEST.parent.mkdir(parents=True,exist_ok=True)
if not DEST.exists():
    print(f'Downloading {URL}')
    urlretrieve(URL,DEST)
print(f'Model available: {DEST} ({DEST.stat().st_size} bytes)')
