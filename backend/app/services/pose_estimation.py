"""MediaPipe Tasks Pose Landmarker adapter; model is pretrained and supplied separately."""
import os
from pathlib import Path
import cv2
import numpy as np

class PoseModelUnavailable(RuntimeError): pass

class PoseEstimator:
    def __init__(self, model_path=None, running_mode='IMAGE'):
        self.model_path=Path(model_path or os.getenv('MEDIAPIPE_POSE_MODEL',str(Path(__file__).resolve().parents[2]/'models'/'pose_landmarker_lite.task')))
        if not self.model_path.is_file(): raise PoseModelUnavailable(f'Pose model file missing: {self.model_path}. Run python scripts/download_pose_model.py')
        try:
            import mediapipe as mp
            from mediapipe.tasks import python
            from mediapipe.tasks.python import vision
        except ImportError as e: raise PoseModelUnavailable('Install mediapipe from backend/requirements-vision.txt') from e
        mode=vision.RunningMode.VIDEO if running_mode=='VIDEO' else vision.RunningMode.IMAGE
        options=vision.PoseLandmarkerOptions(base_options=python.BaseOptions(model_asset_path=str(self.model_path)),running_mode=mode,num_poses=1,output_segmentation_masks=False)
        self.mp=mp
        try: self.landmarker=vision.PoseLandmarker.create_from_options(options)
        except Exception as e: raise PoseModelUnavailable(f'Could not initialize MediaPipe pose model: {e}') from e
        self.mode=mode
    def process_bgr(self, frame, timestamp_ms=None):
        if frame is None or not isinstance(frame,np.ndarray) or frame.ndim!=3 or frame.shape[2]!=3: raise ValueError('Expected a decoded BGR color frame')
        rgb=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB)
        image=self.mp.Image(image_format=self.mp.ImageFormat.SRGB,data=rgb)
        result=self.landmarker.detect_for_video(image,timestamp_ms) if timestamp_ms is not None else self.landmarker.detect(image)
        if not result.pose_landmarks: return {'detected':False,'landmarks':[],'world_landmarks':[],'imageWidth':int(frame.shape[1]),'imageHeight':int(frame.shape[0])}
        def serialize(lms):return [{'x':float(p.x),'y':float(p.y),'z':float(p.z),'visibility':float(p.visibility or 0)} for p in lms]
        return {'detected':True,'landmarks':serialize(result.pose_landmarks[0]),'world_landmarks':serialize(result.pose_world_landmarks[0]) if result.pose_world_landmarks else [],'imageWidth':int(frame.shape[1]),'imageHeight':int(frame.shape[0])}
    def close(self): self.landmarker.close()
