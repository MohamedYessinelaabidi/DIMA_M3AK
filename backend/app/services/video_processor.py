"""Local frame-by-frame processing. Input files and frames are not persisted."""
import cv2
from app.services.pose_estimation import PoseEstimator
from app.services.joint_angles import AngleSmoother
from app.services.posture_analysis import analyze_posture

def process_video(path, max_frames=900, sample_fps=5, camera_view="unknown"):
    cap=cv2.VideoCapture(str(path))
    if not cap.isOpened(): raise ValueError('Unsupported or unreadable video')
    fps=cap.get(cv2.CAP_PROP_FPS) or 0
    if fps<=0: cap.release(); raise ValueError('Video has invalid frame rate')
    duration=cap.get(cv2.CAP_PROP_FRAME_COUNT)/fps
    if duration>180: cap.release(); raise ValueError('Video duration exceeds 180 seconds')
    step=max(1,round(fps/max(0.1,sample_fps)))
    estimator=PoseEstimator(running_mode='VIDEO'); smoother=AngleSmoother(); frames=[]; i=0
    try:
        while len(frames)<max_frames:
            ok,frame=cap.read()
            if not ok: break
            if i%step==0:
                pose=estimator.process_bgr(frame,int(i*1000/fps))
                result=analyze_posture(pose['landmarks'],smoother,camera_view) if pose['detected'] else None
                frames.append({'timestampMs':int(i*1000/fps),'detected':pose['detected'],'landmarks':pose['landmarks'],'analysis':result})
            i+=1
    finally: cap.release(); estimator.close()
    if not frames: raise ValueError('No decodable frames found')
    return {'frameCount':i,'sampledFrameCount':len(frames),'fps':fps,'frames':frames,'videoStored':False,'cameraView':camera_view,'limitations':['Video is processed locally by this API and temporary upload is deleted after response.','Only sampled frames are analyzed; fast transitions may be missed.']}
