from fastapi import FastAPI, HTTPException, Request, Header
from contextlib import asynccontextmanager
import asyncio
from threading import Lock
from importlib.metadata import PackageNotFoundError, version as package_version
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from typing import Any, Literal
from datetime import datetime, timezone
import tempfile, os, uuid
import cv2, numpy as np
from app.schemas.pose import AutomaticAssessmentRequest
from app.database.store import SQLiteStore
from app.services.pose_estimation import PoseEstimator, PoseModelUnavailable
from app.services.posture_analysis import analyze_posture
from app.services.joint_angles import AngleSmoother
from app.services.video_processor import process_video
from app.schemas.assessment import AssessmentInput
from app.services.rula_engine import score_rula
from app.services.reba_engine import score_reba
from app.services.aggregation import aggregate_feedback, detect_trend
from app.services.simulation_engine import compare_configurations
from app.services.recommendation_engine import recommendations
from app.services.roi_engine import calculate_roi

@asynccontextmanager
async def lifespan(app):
    yield
    global LIVE_ESTIMATOR
    if LIVE_ESTIMATOR is not None: LIVE_ESTIMATOR.close(); LIVE_ESTIMATOR=None
app=FastAPI(title='ERGO-PREDICT API',version='1.0.0',description='Participative ergonomic decision support. Demo data is synthetic; this system does not diagnose or score workers.',lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=['http://localhost:5173','http://127.0.0.1:5173'],allow_credentials=True,allow_methods=['*'],allow_headers=['*'])
STORE=SQLiteStore()
WORKSTATIONS=[{'id':'LEONI-MONTAGE-01','name':'LEONI-MONTAGE-01','line':'Automotive wiring harness assembly — synthetic demo','tableHeight':95,'reachDistance':55,'cycleTime':276,'dataClass':'synthetic demo','connectorZones':[{'id':'A','name':'Connector Group A','x':-45,'y':80,'z':20},{'id':'B','name':'Connector Group B','x':35,'y':80,'z':20},{'id':'C','name':'Connector Group C','x':-15,'y':62,'z':12},{'id':'D','name':'Connector Group D','x':10,'y':75,'z':28}]}]
TASKS=[{'id':'terminal-insertion','name':'Terminal insertion','durationSeconds':276,'repetitionsPerHour':180,'estimatedForce':None,'associatedBodyZones':['Left Shoulder','Left Wrist'],'workstationZones':['Connector Group A']},{'id':'component-connection','name':'Component connection','durationSeconds':276,'repetitionsPerHour':125,'estimatedForce':None,'associatedBodyZones':['Right Shoulder','Right Elbow'],'workstationZones':['Connector Group B']},{'id':'harness-positioning','name':'Harness positioning','durationSeconds':276,'repetitionsPerHour':60,'estimatedForce':None,'associatedBodyZones':['Lower Back'],'workstationZones':['Connector Group C']},{'id':'taping','name':'Taping','durationSeconds':276,'repetitionsPerHour':210,'estimatedForce':None,'associatedBodyZones':['Right Wrist','Right Hand'],'workstationZones':['Connector Group D']}]
class FeedbackIn(BaseModel):
    model_config=ConfigDict(extra='forbid')
    workstationId:str=Field(min_length=1,max_length=80); anonymousId:str=Field(min_length=1,max_length=80); bodyZone:str=Field(min_length=1,max_length=80); side:Literal['left','right','both','none']; discomfort:int=Field(ge=0,le=10); taskId:str=Field(min_length=1,max_length=80); timestamp:str|None=None; duration:str|None=None; comment:str|None=Field(None,max_length=500)
class SimulationIn(BaseModel): before:dict[str,Any]; proposed:dict[str,Any]
class RoiIn(BaseModel): cost:float=Field(ge=0); annualSavings:float=Field(ge=0)
class InterventionIn(BaseModel):
    model_config=ConfigDict(extra='forbid')
    id:str|None=None; workstationId:str=Field(min_length=1,max_length=80); title:str=Field(min_length=1,max_length=160); description:str=''; status:Literal['Proposed','Planned','Implemented','Evaluated']='Proposed'; costEstimate:float=Field(ge=0); implementationDifficulty:str='Unspecified'; originalConfiguration:dict[str,Any]=Field(default_factory=dict); proposedConfiguration:dict[str,Any]=Field(default_factory=dict); beforeAssessment:dict[str,Any]=Field(default_factory=dict); afterAssessment:dict[str,Any]=Field(default_factory=dict)
@app.get('/api/health')
async def health():
    db=STORE.health(); pose=await pose_status()
    return {'status':'ok' if db['status']=='ok' else 'degraded','version':'1.1.0','database':db,'poseEstimation':{'dependencyInstalled':pose['mediapipeInstalled'],'modelAvailable':pose['modelPresent'],'available':pose['available']},'demoData':'synthetic'}
@app.get('/api/workstations')
async def workstations():return WORKSTATIONS
@app.get('/api/workstations/{workstation_id}')
async def workstation(workstation_id:str):
    item=next((w for w in WORKSTATIONS if w['id']==workstation_id),None)
    if not item:raise HTTPException(404,'Workstation not found')
    return item
@app.get('/api/analysis/tasks/{workstation_id}')
async def task_analysis(workstation_id:str):
    await workstation(workstation_id)
    return {'workstationId':workstation_id,'items':[{**t,'workstationId':workstation_id} for t in TASKS],'dataClass':'synthetic demo'}
@app.get('/api/analysis/body-zones/{workstation_id}')
async def body_zone_analysis(workstation_id:str):
    await workstation(workstation_id)
    rows=STORE.feedback(workstation_id)
    normalized=[{'bodyZone':r['body_zone'],'side':r['side'],'taskId':r['task_id'],'discomfort':r['discomfort']} for r in rows]
    return {'workstationId':workstation_id,'items':[x for x in aggregate_feedback(normalized) if x['reports']>=3],'minimumGroupSize':3,'dataClass':'aggregated feedback'}
@app.post('/api/assessments/rula')
async def rula(p:AssessmentInput):return score_rula(p)
@app.post('/api/assessments/reba')
async def reba(p:AssessmentInput):return score_reba(p)
@app.post('/api/feedback')
async def feedback(p:FeedbackIn):
    await workstation(p.workstationId)
    record=p.model_dump();record['id']=str(uuid.uuid4());record['timestamp']=record['timestamp'] or datetime.now(timezone.utc).isoformat();STORE.add_feedback(record);return {'status':'accepted','id':record['id'],'persisted':True}
@app.get('/api/feedback/aggregates/{workstation_id}')
async def aggregates(workstation_id:str):
    await workstation(workstation_id)
    rows=STORE.feedback(workstation_id)
    return [x for x in aggregate_feedback([{'bodyZone':r['body_zone'],'side':r['side'],'taskId':r['task_id'],'discomfort':r['discomfort']} for r in rows]) if x['reports']>=3]
@app.post('/api/simulation')
@app.post('/api/simulation/compare')
async def simulate(p:SimulationIn):return compare_configurations(p.before,p.proposed)
@app.post('/api/recommendations')
async def recommend(data:list[dict]):return recommendations(data)
@app.post('/api/roi')
async def roi(p:RoiIn):return calculate_roi(p.cost,p.annualSavings)
@app.get('/api/recommendations/{workstation_id}')
async def workstation_recommendations(workstation_id:str):
    ag=await aggregates(workstation_id)
    return recommendations(ag)
@app.post('/api/interventions')
async def create_intervention(p:InterventionIn):
    await workstation(p.workstationId)
    record=p.model_dump();record['id']=record['id'] or str(uuid.uuid4());record['createdAt']=datetime.now(timezone.utc).isoformat();STORE.add_json('interventions',record);return {'item':record,'persisted':True}
@app.get('/api/interventions/{workstation_id}')
async def interventions(workstation_id:str):
    await workstation(workstation_id)
    return {'items':STORE.list_json('interventions',workstation_id),'persisted':True}
@app.get('/api/trends/demo')
async def trends():return detect_trend([{'reports':3},{'reports':4},{'reports':6},{'reports':7}])

POSE_HISTORY=[]
LIVE_SMOOTHERS={}
LIVE_ESTIMATOR=None
LIVE_MODEL_LOCK=Lock()
def _run_live_pose(frame):
    global LIVE_ESTIMATOR
    with LIVE_MODEL_LOCK:
        if LIVE_ESTIMATOR is None: LIVE_ESTIMATOR=PoseEstimator()
        return LIVE_ESTIMATOR.process_bgr(frame)
def _read_limited(request,limit):
    chunks=[]; total=0
    async def read():
        nonlocal total
        async for chunk in request.stream():
            total+=len(chunk)
            if total>limit: raise HTTPException(413,f'Upload exceeds {limit//1_000_000} MB limit')
            chunks.append(chunk)
        return b''.join(chunks)
    return read()
def _automatic_inputs(p:AutomaticAssessmentRequest):
    side=p.side; a=p.angles; c=p.confirmations
    def observation(key):
        if p.cameraView != 'side' or not p.postureAnglesConfirmed: return None
        item=a.get(key)
        if item is None or item.degrees is None or item.confidence < 0.70: return None
        return item.degrees
    def side_deg(name): return observation(f'{side}_{name}')
    knee=side_deg('knee')
    common={'side':side,'upper_arm_angle':side_deg('shoulder'),'lower_arm_angle':side_deg('elbow'),'wrist_angle':side_deg('wrist'),'neck_angle':observation('neck_inclination'),'trunk_angle':observation('trunk_inclination'),'knee_flexion_angle':None if knee is None else max(0,180-knee)}
    # Unavailable/ambiguous factors remain absent; the scoring engine returns INCOMPLETE.
    return {**common,**c}
@app.get('/api/pose/status')
async def pose_status():
    path=os.getenv('MEDIAPIPE_POSE_MODEL',str(__import__('pathlib').Path(__file__).resolve().parents[1]/'models'/'pose_landmarker_lite.task'))
    try: installed_version=package_version('mediapipe'); installed=True
    except PackageNotFoundError: installed=False; installed_version=None
    return {'available':installed and os.path.isfile(path),'mediapipeInstalled':installed,'mediapipeVersion':installed_version,'modelPath':os.path.basename(path),'modelPresent':os.path.isfile(path),'model':'MediaPipe Pose Landmarker Lite (pretrained; local task asset)','videoStored':False}
@app.post('/api/pose/analyze')
async def analyze_image(request:Request, x_filename:str|None=Header(None), x_camera_view:str|None=Header(None), x_pose_session:str|None=Header(None)):
    data=await _read_limited(request,12_000_000)
    if not data: raise HTTPException(400,'Empty image upload')
    if len(data)>=12_000_000: raise HTTPException(413,'Image exceeds 12 MB limit')
    if not (data.startswith(b'\x89PNG\r\n\x1a\n') or data.startswith(b'\xff\xd8\xff')):
        raise HTTPException(415,'Upload must be a supported PNG or JPEG image')
    model_state=await pose_status()
    if not model_state['available']:
        raise HTTPException(503,'Pose model unavailable. Install MediaPipe and download the local model asset before analysis.')
    frame=cv2.imdecode(np.frombuffer(data,dtype=np.uint8),cv2.IMREAD_COLOR)
    if frame is None: raise HTTPException(415,'Upload must be a supported image')
    if frame.shape[0]>4096 or frame.shape[1]>4096: raise HTTPException(413,'Decoded image exceeds 4096px per side')
    try:
        pose=await asyncio.to_thread(_run_live_pose,frame)
        key=x_pose_session or 'default'
        if key not in LIVE_SMOOTHERS and len(LIVE_SMOOTHERS)>=100: LIVE_SMOOTHERS.pop(next(iter(LIVE_SMOOTHERS)))
        smoother=LIVE_SMOOTHERS.setdefault(key,AngleSmoother())
        result=analyze_posture(pose['landmarks'],smoother,x_camera_view or 'unknown',frame.shape) if pose['detected'] else None
        return {'detected':pose['detected'],'landmarks':pose['landmarks'],'analysis':result,'frameStored':False}
    except PoseModelUnavailable as e: raise HTTPException(503,str(e))
@app.post('/api/pose/analyze-video')
async def analyze_video(request:Request, x_filename:str|None=Header(None), x_camera_view:str|None=Header(None)):
    data=await _read_limited(request,100_000_000)
    # Reject obvious non-video payloads before passing untrusted bytes to native codecs.
    header=data[:32]
    known_container=(b'ftyp' in header or header.startswith(b'\x1aE\xdf\xa3') or header.startswith(b'RIFF'))
    if not known_container: raise HTTPException(415,'Upload must be a supported MP4, WebM, or AVI video')
    if len(data)>100_000_000: raise HTTPException(413,'Video exceeds 100 MB limit')
    suffix=os.path.splitext(x_filename or 'video.mp4')[1][:8] or '.mp4'; path=None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix,delete=False) as tmp: tmp.write(data);path=tmp.name
        return await asyncio.to_thread(process_video,path,camera_view=x_camera_view or 'unknown')
    except PoseModelUnavailable as e: raise HTTPException(503,str(e))
    except ValueError as e: raise HTTPException(415,str(e))
    finally:
        if path and os.path.exists(path): os.remove(path)
@app.post('/api/assessments/automatic')
async def automatic_assessment(p:AutomaticAssessmentRequest):
    values=_automatic_inputs(p)
    try: payload=AssessmentInput(**values)
    except Exception as e: raise HTTPException(422,str(e))
    r=score_rula(payload);b=score_reba(payload)
    return {'id':str(uuid.uuid4()),'classification':'VIDEO_ESTIMATES_PLUS_MANUAL_CONFIRMATIONS','cameraView':p.cameraView,'postureAnglesConfirmed':p.postureAnglesConfirmed,'side':p.side,'postureConfidence':p.postureConfidence,'rula':r,'reba':b,'missingConfirmations':{'rula':r.get('missingInputs',[]),'reba':b.get('missingInputs',[])},'saved':False}
@app.post('/api/assessments/confirm')
async def confirm_assessment(p:AutomaticAssessmentRequest):
    result=await automatic_assessment(p)
    if result['rula'].get('status')=='INCOMPLETE' or result['reba'].get('status')=='INCOMPLETE': raise HTTPException(422,'Complete all required observations before saving a confirmed assessment')
    result['saved']=True;result['confirmedAt']=datetime.now(timezone.utc).isoformat();result['workstationId']=p.workstationId
    STORE.add_json('assessments',result)
    return result
@app.get('/api/assessments/history')
async def assessment_history(): return {'items':STORE.list_json('assessments','LEONI-MONTAGE-01'),'persistence':'SQLite'}
@app.get('/api/assessments/{workstation_id}')
async def workstation_assessments(workstation_id:str):
    await workstation(workstation_id)
    return {'items':STORE.list_json('assessments',workstation_id),'persistence':'SQLite'}
