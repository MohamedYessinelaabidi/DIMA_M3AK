import math
import pytest
from app.services.joint_angles import vector_angle,extract_joint_angles,AngleSmoother
from app.services.posture_analysis import analyze_posture

def test_vector_angle_right_angle_and_degenerate():
    assert vector_angle((1,0),(0,0),(0,1))==pytest.approx(90)
    assert vector_angle((0,0),(0,0),(1,0)) is None

def test_missing_low_visibility_landmarks_do_not_create_angle():
    l=[{'x':0.0,'y':0.0,'visibility':1.0} for _ in range(33)]
    l[11]['visibility']=0.1
    a=extract_joint_angles(l)
    assert a['left_shoulder']['degrees'] is None
    assert a['left_shoulder']['status']=='UNAVAILABLE'

def test_invalid_landmarks_rejected_as_unavailable():
    l=[{'x':0.2,'y':0.2,'visibility':1.0} for _ in range(33)]
    l[13]['x']=float('nan')
    assert extract_joint_angles(l)['left_shoulder']['degrees'] is None

def test_smoother_ema_and_jump_guard():
    s=AngleSmoother(alpha=.5,max_jump=30)
    def sample(v):return {'x':{'degrees':v,'confidence':.9,'status':'OBSERVED'}}
    assert s.update(sample(20))['x']['degrees']==20
    assert s.update(sample(30))['x']['degrees']==25
    assert s.update(sample(100))['x']['status']=='JUMP_REJECTED'
    assert s.update({'x':{'degrees':None,'confidence':0,'status':'UNAVAILABLE'}})['x']['degrees'] is None

def test_posture_output_marks_findings_observed_or_estimated():
    l=[{'x':.5,'y':.5,'z':0,'visibility':1} for _ in range(33)]
    # Synthetic landmark fixture only; not a human or worker sample.
    for i,(x,y) in {0:(.5,.1),11:(.4,.25),12:(.6,.25),13:(.3,.3),14:(.7,.3),15:(.2,.4),16:(.8,.4),19:(.2,.42),20:(.8,.42),23:(.42,.6),24:(.58,.6),25:(.42,.8),26:(.58,.8),27:(.42,.95),28:(.58,.95)}.items():l[i].update(x=x,y=y)
    r=analyze_posture(l)
    assert r['angles']['left_elbow']['degrees'] is not None
    assert all(x['classification'] in ('OBSERVED_POSTURE_FROM_ESTIMATES','ESTIMATED') for x in r['findings'])
