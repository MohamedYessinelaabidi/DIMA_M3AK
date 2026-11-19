def compare_configurations(before:dict, proposed:dict):
    changed={k:{'before':before[k],'proposed':proposed[k]} for k in proposed if k in before and before[k]!=proposed[k]}
    return {'status':'INCOMPLETE','classification':'SIMULATED POSTURE ESTIMATE','changedParameters':changed,'postureChanges':None,'rula':None,'reba':None,'missingMeasurements':['New manual posture assessment required after workstation modification'],'confidence':'NOT_ESTIMATED','note':'Geometry changes do not directly change RULA/REBA scores. No validated inverse-kinematics model is configured.'}
