from app.services.joint_angles import extract_joint_angles, AngleSmoother

def analyze_posture(landmarks, smoother=None, camera_view="unknown", image_shape=None):
    height,width=(image_shape[:2] if image_shape is not None else (1,1))
    angles=extract_joint_angles(landmarks,width,height)
    if smoother: angles=smoother.update(angles)
    if camera_view != 'side':
        for key in ('neck_inclination','trunk_inclination'):
            angles[key]={'degrees':None,'confidence':0.0,'status':'UNAVAILABLE_CAMERA_VIEW'}
    observed=[]
    for side in ('left','right'):
        shoulder=angles[f'{side}_shoulder']; elbow=angles[f'{side}_elbow']; knee=angles[f'{side}_knee']
        if shoulder['degrees'] is not None and shoulder['degrees']>60: observed.append({'finding':f'{side.title()} arm elevated','evidence':shoulder,'classification':'OBSERVED_POSTURE_FROM_ESTIMATES'})
        if elbow['degrees'] is not None and 50<=elbow['degrees']<=130: observed.append({'finding':f'{side.title()} elbow flexion','evidence':elbow,'classification':'OBSERVED_POSTURE_FROM_ESTIMATES'})
        if knee['degrees'] is not None and knee['degrees']<160: observed.append({'finding':f'{side.title()} knee flexion','evidence':knee,'classification':'OBSERVED_POSTURE_FROM_ESTIMATES'})
    for key,label,threshold in [('trunk_inclination','Trunk bending',20),('neck_inclination','Neck bending',20)]:
        a=angles[key]
        if a['degrees'] is not None and abs(a['degrees'])>threshold:observed.append({'finding':label,'evidence':a,'classification':'OBSERVED_POSTURE_FROM_ESTIMATES'})
    l=angles['left_shoulder']['degrees'];r=angles['right_shoulder']['degrees']
    if l is not None and r is not None and abs(l-r)>20: observed.append({'finding':'Asymmetrical shoulder posture','evidence':{'left':angles['left_shoulder'],'right':angles['right_shoulder']},'classification':'ESTIMATED'})
    reliable=[a['confidence'] for a in angles.values() if a['degrees'] is not None]
    return {'measurementType':'ESTIMATED_FROM_VIDEO_LANDMARKS','angles':angles,'findings':observed,'confidence':round(sum(reliable)/len(reliable),3) if reliable else 0,'cameraView':camera_view,'limitations':['Single-camera image-plane angles are not calibrated 3D joint angles; sagittal inclination is reported only for an explicitly selected side view.','Occlusion, camera angle and clothing can reduce reliability.','Load, force, coupling, support, wrist twist and task repetition require manual confirmation.']}
