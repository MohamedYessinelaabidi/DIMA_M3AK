def recommendations(aggregates, task_name=None, workstation_zone=None, assessments=None):
    results=[]
    for a in aggregates:
        if a['reports']>=3 and a['averageDiscomfort']>=4:
            results.append({'title':f'Investigate {a["bodyZone"]} exposure','reason':f'Aggregated reports associate {a["bodyZone"]} discomfort with task {task_name or a.get("taskId") or "not specified"}.','suggestedAction':'Review task sequence, workstation reach and posture with workers and an ergonomist.','priority':'HIGH' if a['averageDiscomfort']>=6 else 'MEDIUM','expectedImpact':'Not estimated','confidence':'NOT_ESTIMATED','evidence':['Aggregated worker feedback'],'causality':'Association only; not proof of causation.'})
    return results
