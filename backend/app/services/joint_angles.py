"""2D image-plane joint angle calculations. Angles are observations, not calibrated 3D biomechanics."""
from math import acos, degrees, hypot, isfinite
from typing import Any

VISIBILITY_MIN = 0.55

def vector_angle(a, vertex, c):
    """Unsigned angle ABC in degrees, rejecting non-finite/degenerate coordinates."""
    u=[float(a[i])-float(vertex[i]) for i in range(2)]
    v=[float(c[i])-float(vertex[i]) for i in range(2)]
    nu=hypot(*u); nv=hypot(*v)
    if not isfinite(nu*nv) or nu < 1e-8 or nv < 1e-8: return None
    cos=max(-1.0,min(1.0,(u[0]*v[0]+u[1]*v[1])/(nu*nv)))
    return degrees(acos(cos))

def _point(lms, idx, sx=1.0, sy=1.0):
    if lms is None or idx >= len(lms): return None
    lm=lms[idx]
    x=lm.get('x') if isinstance(lm,dict) else getattr(lm,'x',None)
    y=lm.get('y') if isinstance(lm,dict) else getattr(lm,'y',None)
    vis=lm.get('visibility',1) if isinstance(lm,dict) else getattr(lm,'visibility',1)
    if x is None or y is None or vis is None or vis < VISIBILITY_MIN: return None
    if not isfinite(float(x)) or not isfinite(float(y)): return None
    return (float(x)*sx,float(y)*sy,float(vis))

def _angle(lms, ids, sx=1.0, sy=1.0, supplementary=False):
    pts=[_point(lms,i,sx,sy) for i in ids]
    if any(p is None for p in pts): return {'degrees':None,'confidence':0.0,'status':'UNAVAILABLE'}
    val=vector_angle(pts[0],pts[1],pts[2])
    if val is not None and supplementary: val=180.0-val
    if val is None:return {'degrees':None,'confidence':0.0,'status':'DEGENERATE'}
    # Landmark visibility is confidence proxy, not calibrated measurement uncertainty.
    conf=round(min(p[2] for p in pts),3)
    return {'degrees':round(val,1),'confidence':conf,'status':'ESTIMATED' if conf>=0.75 else 'LOW_CONFIDENCE_ESTIMATE'}

def extract_joint_angles(landmarks, image_width=1, image_height=1):
    """MediaPipe 33-point landmarks. Visibility is carried through each angle."""
    l=landmarks; sx=float(image_width); sy=float(image_height)
    out={
      'left_elbow':_angle(l,[11,13,15],sx,sy), 'right_elbow':_angle(l,[12,14,16],sx,sy),
      'left_shoulder':_angle(l,[23,11,13],sx,sy), 'right_shoulder':_angle(l,[24,12,14],sx,sy),
      'left_wrist':_angle(l,[13,15,19],sx,sy,True), 'right_wrist':_angle(l,[14,16,20],sx,sy,True),
      'left_hip':_angle(l,[11,23,25],sx,sy), 'right_hip':_angle(l,[12,24,26],sx,sy),
      'left_knee':_angle(l,[23,25,27],sx,sy), 'right_knee':_angle(l,[24,26,28],sx,sy),
    }
    # Neck and trunk inclination relative to vertical in image plane.
    def inclination(top_ids, bottom_ids):
        top=[_point(l,i,sx,sy) for i in top_ids]; bot=[_point(l,i,sx,sy) for i in bottom_ids]
        if any(x is None for x in top+bot):return {'degrees':None,'confidence':0.0,'status':'UNAVAILABLE'}
        tx=sum(p[0] for p in top)/len(top); ty=sum(p[1] for p in top)/len(top)
        bx=sum(p[0] for p in bot)/len(bot); by=sum(p[1] for p in bot)/len(bot)
        # 0 is vertical; positive degrees indicate forward lean as seen in image.
        dx=tx-bx; dy=by-ty
        if hypot(dx,dy)<1e-8:return {'degrees':None,'confidence':0.0,'status':'DEGENERATE'}
        val=degrees(__import__('math').atan2(dx,dy))
        conf=round(min(p[2] for p in top+bot),3)
        return {'degrees':round(val,1),'confidence':conf,'status':'ESTIMATED' if conf>=0.75 else 'LOW_CONFIDENCE_ESTIMATE'}
    out['neck_inclination']=inclination([0],[11,12])
    out['trunk_inclination']=inclination([11,12],[23,24])
    return out

class AngleSmoother:
    """EMA smoothing with jump rejection; missing observations remain missing."""
    def __init__(self, alpha=0.35, max_jump=45):
        if not 0 < alpha <= 1: raise ValueError('alpha must be in (0,1]')
        self.alpha=alpha; self.max_jump=max_jump; self.values={}
    def update(self, values:dict[str,Any]):
        result={}
        for key,item in values.items():
            v=item.get('degrees')
            if v is None: result[key]=item; continue
            old=self.values.get(key)
            if old is not None and abs(v-old)>self.max_jump:
                result[key]={**item,'degrees':round(old,1),'status':'JUMP_REJECTED','confidence':round(item.get('confidence',0)*0.5,3)}
                continue
            smoothed=float(v) if old is None else self.alpha*float(v)+(1-self.alpha)*old
            self.values[key]=smoothed
            result[key]={**item,'degrees':round(smoothed,1),'status':'SMOOTHED_ESTIMATE' if old is not None else item['status']}
        return result
