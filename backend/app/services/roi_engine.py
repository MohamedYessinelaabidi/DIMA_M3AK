def calculate_roi(cost:float, annual_savings:float):
    if cost<0 or annual_savings<0: raise ValueError('Cost and annual savings assumptions must be non-negative')
    return {'interventionCost':cost,'estimatedAnnualSavings':annual_savings,'roiPercent':round((annual_savings-cost)/cost*100,1) if cost else None,'paybackMonths':round(cost/annual_savings*12,1) if annual_savings else None,'classification':'ESTIMATE — user supplied assumptions; not verified financial data'}
