"""RULA lookup scoring, McAtamney & Corlett (1993); manual factors remain mandatory."""
from .common import incomplete
TABLE_A=[
 [[1,2,2,2],[2,2,2,3],[2,3,3,3]], [[2,2,3,3],[2,3,3,4],[3,3,4,4]],
 [[3,3,4,4],[3,4,4,5],[4,4,5,5]], [[4,4,5,5],[4,5,5,6],[5,5,6,6]],
 [[5,5,6,7],[6,6,7,7],[6,7,7,8]], [[7,7,8,8],[8,8,9,9],[9,9,9,9]]]
TABLE_B=[
 [[1,2,2,3,3,4],[2,3,3,4,4,5]], [[2,3,3,4,4,5],[3,4,4,5,5,6]],
 [[3,3,4,4,5,5],[4,4,5,5,6,7]], [[4,4,5,5,6,6],[5,5,6,6,7,8]],
 [[5,5,6,6,7,7],[6,6,7,7,8,8]], [[6,6,7,7,8,8],[7,7,8,8,9,9]]]
TABLE_C=[[1,2,3,3,4,5,5],[2,2,3,4,4,5,5],[2,3,3,4,4,5,6],[3,3,3,4,5,6,6],[4,4,4,5,6,7,7],[4,4,5,6,6,7,7],[5,5,5,6,7,7,7],[5,6,6,7,7,7,7]]

def score_rula(p):
    required=['upper_arm_angle','lower_arm_angle','wrist_angle','wrist_deviation','wrist_twist','neck_angle','neck_twist','neck_side_bend','trunk_angle','trunk_twist','trunk_side_bend','leg_support','shoulder_raised','arm_abducted','arm_supported','across_midline','static_or_repetitive','force_load_kg','shock_force','force_static_or_repeated','arm_out_to_side']
    missing=[k for k in required if getattr(p,k,None) is None]
    if missing:return incomplete('RULA',missing)
    ua=1 if -20<=p.upper_arm_angle<=20 else 2 if p.upper_arm_angle< -20 or p.upper_arm_angle<=45 else 3 if p.upper_arm_angle<=90 else 4
    ua=max(1,min(6,ua+int(p.shoulder_raised)+int(p.arm_abducted)-int(p.arm_supported)))
    la=1 if 60<=p.lower_arm_angle<=100 else 2
    la=min(3,la+int(p.across_midline or p.arm_out_to_side))
    wrist=1 if abs(p.wrist_angle)<1 else 2 if abs(p.wrist_angle)<=15 else 3
    wrist=min(3,wrist+int(p.wrist_deviation))
    twist=1 if p.wrist_twist=='mid_range' else 2
    wrist_table_col=min(4,max(1,wrist+twist-1))
    table_a=TABLE_A[ua-1][la-1][wrist_table_col-1]
    # RULA neck category 4 represents extension; it must not be treated as neutral.
    neck=4 if p.neck_angle<0 else 1 if p.neck_angle<=10 else 2 if p.neck_angle<=20 else 3
    neck=min(6,neck+int(p.neck_twist)+int(p.neck_side_bend))
    trunk=1 if abs(p.trunk_angle)<1e-6 else 2 if abs(p.trunk_angle)<=20 else 3 if abs(p.trunk_angle)<=60 else 4
    trunk=min(6,trunk+int(p.trunk_twist)+int(p.trunk_side_bend))
    legs=1 if p.leg_support=='supported_balanced' else 2
    posture_b=TABLE_B[neck-1][legs-1][trunk-1]
    muscle=int(p.static_or_repetitive)
    kg=p.force_load_kg
    force=3 if p.shock_force or kg>10 else (2 if p.force_static_or_repeated and kg>=2 else 1 if kg>=2 else 0)
    score_a=min(8,table_a+muscle+force);score_b=min(7,posture_b+muscle+force)
    final=TABLE_C[min(8,score_a)-1][min(7,score_b)-1]
    action=1 if final<=2 else 2 if final<=4 else 3 if final<=6 else 4
    interpretation={1:'Acceptable posture',2:'Further investigation may be needed',3:'Investigation and changes should be considered soon',4:'Investigation and changes required immediately'}[action]
    return {'method':'RULA','status':'ESTIMATED_POSTURE_WITH_CONFIRMED_MANUAL_FACTORS','groupA':score_a,'groupB':score_b,'postureTableA':table_a,'postureTableB':posture_b,'finalScore':final,'actionLevel':action,'interpretation':interpretation,'breakdown':{'upperArm':ua,'lowerArm':la,'wrist':wrist,'wristTwist':twist,'neck':neck,'trunk':trunk,'legs':legs,'muscleUse':muscle,'forceLoad':force,'tableA':table_a,'tableB':posture_b},'contributingFactors':[name for name,val in [('Upper-arm elevation',ua>=3),('Wrist deviation',p.wrist_deviation),('Neck flexion',neck>=3),('Trunk flexion',trunk>=3)] if val],'limitations':['RULA is a screening method; posture angles estimated from a single camera require assessor review.']}
