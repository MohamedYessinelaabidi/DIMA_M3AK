"""REBA Table A/B/C lookup scoring, Hignett & McAtamney (2000)."""
from .common import incomplete
TABLE_A=[
 [[1,2,3,4],[2,3,4,5],[2,4,5,6],[3,5,6,7],[4,6,7,8]],
 [[1,2,3,4],[3,4,5,6],[4,5,6,7],[5,6,7,8],[6,7,8,9]],
 [[3,3,5,6],[4,5,6,7],[5,6,7,8],[6,7,8,9],[7,8,9,9]]
]
TABLE_B=[[[1,2,2],[1,2,3]],[[1,2,3],[2,3,4]],[[3,4,5],[4,5,5]],[[4,5,5],[5,6,7]],[[6,7,8],[7,8,8]],[[7,8,8],[8,9,9]]]
TABLE_C=[
[1,1,1,2,3,3,4,5,6,7,7,7],[1,2,2,3,4,4,5,6,6,7,7,8],[2,3,3,3,4,5,6,7,7,8,8,8],
[3,4,4,4,5,6,7,8,8,9,9,9],[4,4,4,5,6,7,8,8,9,9,9,9],[6,6,6,7,8,8,9,9,10,10,10,10],
[7,7,7,8,9,9,9,10,10,11,11,11],[8,8,8,9,10,10,10,10,10,11,11,11],
[9,9,9,10,10,10,11,11,11,12,12,12],[10,10,10,11,11,11,11,12,12,12,12,12],
[11,11,11,11,12,12,12,12,12,12,12,12],[12]*12]

def score_reba(p):
    required=['upper_arm_angle','lower_arm_angle','wrist_angle','wrist_deviation','neck_angle','neck_twist','neck_side_bend','trunk_angle','trunk_twist','trunk_side_bend','leg_support','force_load_kg','shock_force','coupling','unstable_or_rapid_change','repeated_small_range','sustained_over_minute','shoulder_raised','arm_abducted','arm_supported','unilateral_weight_bearing','knee_flexion_angle']
    missing=[k for k in required if getattr(p,k,None) is None]
    if missing:return incomplete('REBA',missing)
    # REBA neck score 1 is 0–20° flexion; extension is score 2.
    neck=1 if 0<=p.neck_angle<=20 else 2
    neck=min(3,neck+int(p.neck_twist or p.neck_side_bend))
    trunk=1 if abs(p.trunk_angle)<1e-6 else 2 if abs(p.trunk_angle)<=20 else 3 if abs(p.trunk_angle)<=60 else 4
    trunk=min(5,trunk+int(p.trunk_twist)+int(p.trunk_side_bend))
    legs=2 if p.unilateral_weight_bearing or p.leg_support!='supported_balanced' else 1
    knees=abs(p.knee_flexion_angle);legs+=2 if knees>60 else 1 if knees>=30 else 0;legs=min(4,legs)
    table_a=TABLE_A[neck-1][trunk-1][legs-1]
    load=min(3,(2 if p.force_load_kg>10 else 1 if p.force_load_kg>=5 else 0)+int(p.shock_force))
    score_a=min(12,table_a+load)
    arm=1 if -20<=p.upper_arm_angle<=20 else 2 if p.upper_arm_angle<=45 else 3 if p.upper_arm_angle<=90 else 4
    arm=max(1,min(6,arm+int(p.shoulder_raised)+int(p.arm_abducted)-int(p.arm_supported)))
    fore=1 if 60<=p.lower_arm_angle<=100 else 2
    wrist=min(3,(1 if abs(p.wrist_angle)<=15 else 2)+int(p.wrist_deviation))
    table_b=TABLE_B[arm-1][fore-1][wrist-1]
    coupling={'good':0,'fair':1,'poor':2,'unacceptable':3}[p.coupling]
    score_b=min(12,table_b+coupling)
    score_c=TABLE_C[score_a-1][score_b-1]
    activity=int(p.unstable_or_rapid_change)+int(p.repeated_small_range)+int(p.sustained_over_minute)
    final=min(15,score_c+activity)
    risk='negligible' if final==1 else 'low' if final<=3 else 'medium' if final<=7 else 'high' if final<=10 else 'very high'
    action='No action necessary' if final==1 else 'May be necessary' if final<=3 else 'Necessary' if final<=7 else 'Necessary soon' if final<=10 else 'Necessary now'
    return {'method':'REBA','status':'ESTIMATED_POSTURE_WITH_CONFIRMED_MANUAL_FACTORS','groupA':score_a,'groupB':score_b,'groupC':score_c,'finalScore':final,'riskLevel':risk,'actionLevel':0 if final==1 else 1 if final<=3 else 2 if final<=7 else 3 if final<=10 else 4,'action':action,'breakdown':{'neck':neck,'trunk':trunk,'legs':legs,'upperArm':arm,'lowerArm':fore,'wrist':wrist,'tableA':table_a,'loadForce':load,'tableB':table_b,'coupling':coupling,'activity':activity},'contributingFactors':[name for name,val in [('Trunk bending',trunk>=3),('Neck posture',neck>=2),('Upper-arm elevation',arm>=3),('Leg posture',legs>=3)] if val],'limitations':['Single-camera posture estimates need assessor review; load, grip coupling, support and activity are manually supplied.']}
