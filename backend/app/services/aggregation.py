from collections import defaultdict
from datetime import datetime, timedelta

def aggregate_feedback(rows):
    groups=defaultdict(list)
    for row in rows: groups[(row['bodyZone'],row.get('side','none'),row.get('taskId',''))].append(row)
    out=[]
    for (zone,side,task),items in groups.items():
        out.append({'bodyZone':zone,'side':side,'taskId':task,'reports':len(items),'averageDiscomfort':round(sum(x['discomfort'] for x in items)/len(items),1)})
    return out

def detect_trend(weekly, threshold=0.2):
    if len(weekly)<2:return {'status':'INSUFFICIENT_DATA','message':'At least two periods are required.'}
    vals=[float(x['reports']) for x in weekly]
    delta=(vals[-1]-vals[0])/max(vals[0],1)
    return {'status':'INCREASING' if delta>=threshold else 'STABLE','changeFraction':round(delta,3),'message':'Emerging ergonomic risk; investigate the associated task and exposure.' if delta>=threshold else 'No configured increase detected.'}
