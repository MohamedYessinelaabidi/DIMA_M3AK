import asyncio
import httpx
from app.main import app

def request(method,path,**kwargs):
    async def send():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as c:
            return await c.request(method,path,**kwargs)
    return asyncio.run(send())

def test_pose_status_explains_local_model_availability():
    r=request('GET','/api/pose/status')
    assert r.status_code==200
    assert r.json()['model']=='MediaPipe Pose Landmarker Lite (pretrained; local task asset)'
    assert r.json()['videoStored'] is False

def test_bad_image_input_returns_415():
    r=request('POST','/api/pose/analyze',content=b'not-an-image',headers={'Content-Type':'image/jpeg'})
    assert r.status_code==415

def test_bad_video_input_returns_415():
    r=request('POST','/api/pose/analyze-video',content=b'not-a-video',headers={'Content-Type':'video/mp4','X-Filename':'bad.mp4'})
    assert r.status_code==415

def test_automatic_assessment_does_not_fill_unknown_factors():
    r=request('POST','/api/assessments/automatic',json={'side':'left','angles':{},'confirmations':{},'postureConfidence':0})
    assert r.status_code==200
    assert r.json()['rula']['status']=='INCOMPLETE'
    assert r.json()['reba']['status']=='INCOMPLETE'

def test_incomplete_assessment_cannot_be_saved_as_confirmed():
    r=request('POST','/api/assessments/confirm',json={'side':'left','angles':{},'confirmations':{},'postureConfidence':0})
    assert r.status_code==422

def complete_automatic_request():
    angles={k:{'degrees':v,'confidence':0.96} for k,v in {'left_shoulder':0,'left_elbow':90,'left_wrist':0,'left_knee':180,'neck_inclination':0,'trunk_inclination':0}.items()}
    confirmations={'wrist_deviation':False,'wrist_twist':'mid_range','neck_twist':False,'neck_side_bend':False,'trunk_twist':False,'trunk_side_bend':False,'leg_support':'supported_balanced','shoulder_raised':False,'arm_abducted':False,'arm_supported':False,'across_midline':False,'static_or_repetitive':False,'force_load_kg':0,'shock_force':False,'force_static_or_repeated':False,'arm_out_to_side':False,'coupling':'good','unstable_or_rapid_change':False,'repeated_small_range':False,'sustained_over_minute':False,'unilateral_weight_bearing':False}
    return {'side':'left','cameraView':'side','postureAnglesConfirmed':True,'angles':angles,'confirmations':confirmations,'postureConfidence':0.96}

def test_confirmed_manual_factors_produce_table_scores_and_history():
    payload=complete_automatic_request()
    r=request('POST','/api/assessments/automatic',json=payload)
    assert r.status_code==200
    assert r.json()['rula']['finalScore']==1
    assert r.json()['reba']['finalScore']==1
    saved=request('POST','/api/assessments/confirm',json=payload)
    assert saved.status_code==200 and saved.json()['saved'] is True
    assert request('GET','/api/assessments/history').json()['items'][0]['id']==saved.json()['id']

def test_front_view_angles_are_not_used_for_sagittal_scores():
    payload=complete_automatic_request();payload['cameraView']='front'
    r=request('POST','/api/assessments/automatic',json=payload)
    assert r.status_code==200
    assert r.json()['rula']['status']=='INCOMPLETE'

def test_valid_image_reports_missing_model_instead_of_no_pose():
    import struct, zlib
    if request('GET','/api/pose/status').json()['available']:
        return
    def chunk(kind,data):
        return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
    raw=b''.join(b'\x00'+b'\x00\x00\x00'*32 for _ in range(32))
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',32,32,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
    r=request('POST','/api/pose/analyze',content=png,headers={'Content-Type':'image/png','X-Camera-View':'side'})
    assert r.status_code==503
    assert 'model' in r.json()['detail'].lower()

def test_invalid_pose_confidence_is_rejected():
    r=request('POST','/api/assessments/automatic',json={'side':'left','cameraView':'side','postureAnglesConfirmed':True,'angles':{'left_elbow':{'degrees':90,'confidence':1.5}},'confirmations':{},'postureConfidence':0.5})
    assert r.status_code==422

def test_health_reports_database_pose_and_version():
    r=request('GET','/api/health')
    assert r.status_code==200
    body=r.json()
    assert body['status'] in ('ok','degraded') and body['version']
    assert body['database']['status']=='ok'
    assert 'modelAvailable' in body['poseEstimation']

def test_workstation_tasks_and_body_zone_routes():
    assert request('GET','/api/workstations').json()[0]['dataClass']=='synthetic demo'
    assert request('GET','/api/analysis/tasks/LEONI-MONTAGE-01').status_code==200
    assert len(request('GET','/api/analysis/tasks/LEONI-MONTAGE-01').json()['items'])==4
    assert request('GET','/api/analysis/body-zones/LEONI-MONTAGE-01').json()['items']==[]
    assert request('GET','/api/workstations/unknown').status_code==404

def test_feedback_is_persisted_but_only_aggregated_response_exposes_it(tmp_path,monkeypatch):
    from app import main
    from app.database.store import SQLiteStore
    monkeypatch.setattr(main,'STORE',SQLiteStore(tmp_path/'test.sqlite3'))
    payload={'workstationId':'LEONI-MONTAGE-01','anonymousId':'anon-test','bodyZone':'Left Shoulder','side':'left','discomfort':7,'taskId':'terminal-insertion'}
    for _ in range(3): assert request('POST','/api/feedback',json=payload).status_code==200
    response=request('GET','/api/feedback/aggregates/LEONI-MONTAGE-01')
    assert response.status_code==200 and response.json()[0]['reports']==3
    assert 'anonymousId' not in response.text and 'comment' not in response.text
    reopened=SQLiteStore(tmp_path/'test.sqlite3')
    assert len(reopened.feedback('LEONI-MONTAGE-01'))==3

def test_intervention_create_and_history_persist(tmp_path,monkeypatch):
    from app import main
    from app.database.store import SQLiteStore
    monkeypatch.setattr(main,'STORE',SQLiteStore(tmp_path/'test.sqlite3'))
    payload={'workstationId':'LEONI-MONTAGE-01','title':'Test fixture intervention','costEstimate':123.0,'proposedConfiguration':{'reach':40}}
    created=request('POST','/api/interventions',json=payload)
    assert created.status_code==200 and created.json()['persisted']
    history=request('GET','/api/interventions/LEONI-MONTAGE-01')
    assert history.status_code==200 and history.json()['items'][0]['title']==payload['title']

def test_api_simulation_recommendations_and_roi_are_explainable():
    simulation=request('POST','/api/simulation',json={'before':{'reach':55},'proposed':{'reach':40}})
    assert simulation.status_code==200 and simulation.json()['rula'] is None
    assert simulation.json()['changedParameters']['reach']=={'before':55,'proposed':40}
    rec=request('POST','/api/recommendations',json=[{'bodyZone':'Shoulder','side':'left','taskId':'insert','reports':4,'averageDiscomfort':6}])
    assert rec.status_code==200 and rec.json()[0]['confidence']=='NOT_ESTIMATED'
    roi=request('POST','/api/roi',json={'cost':1000,'annualSavings':2500})
    assert roi.status_code==200 and roi.json()['roiPercent']==150
    assert roi.json()['paybackMonths']==4.8

def test_api_assessment_routes_validate_and_score():
    r=request('POST','/api/assessments/rula',json={'side':'left'})
    assert r.status_code==200 and r.json()['status']=='INCOMPLETE'
    r=request('POST','/api/assessments/reba',json={'side':'left'})
    assert r.status_code==200 and r.json()['status']=='INCOMPLETE'
    complete={'side':'left','upper_arm_angle':0,'lower_arm_angle':90,'wrist_angle':0,'wrist_deviation':False,'wrist_twist':'mid_range','neck_angle':0,'neck_twist':False,'neck_side_bend':False,'trunk_angle':0,'trunk_twist':False,'trunk_side_bend':False,'leg_support':'supported_balanced','shoulder_raised':False,'arm_abducted':False,'arm_supported':False,'across_midline':False,'static_or_repetitive':False,'force_load_kg':0,'shock_force':False,'force_static_or_repeated':False,'arm_out_to_side':False,'coupling':'good','unstable_or_rapid_change':False,'repeated_small_range':False,'sustained_over_minute':False,'unilateral_weight_bearing':False,'knee_flexion_angle':0}
    r=request('POST','/api/assessments/rula',json=complete)
    assert r.status_code==200 and r.json()['finalScore']==1
    r=request('POST','/api/assessments/reba',json=complete)
    assert r.status_code==200 and r.json()['finalScore']==1


def test_cors_preflight_allows_local_camera_headers():
    r=request('OPTIONS','/api/pose/analyze',headers={'Origin':'http://localhost:5173','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,x-camera-view,x-pose-session'})
    assert r.status_code==200
    assert r.headers.get('access-control-allow-origin')=='http://localhost:5173'
    assert 'x-camera-view' in r.headers.get('access-control-allow-headers','').lower()

def test_get_assessment_history_is_station_scoped():
    r=request('GET','/api/assessments/LEONI-MONTAGE-01')
    assert r.status_code==200 and r.json()['persistence']=='SQLite'
