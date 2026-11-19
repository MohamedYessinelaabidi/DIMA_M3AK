from pydantic import BaseModel, Field, ConfigDict
from typing import Any, Literal

class AngleObservation(BaseModel):
    model_config=ConfigDict(extra='forbid')
    degrees:float|None
    confidence:float=Field(ge=0,le=1)
    status:str|None=None

class AutomaticAssessmentRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    side:Literal['left','right']
    workstationId:str='LEONI-MONTAGE-01'
    cameraView:Literal['side','front','unknown']='unknown'
    postureAnglesConfirmed:bool=False
    angles:dict[str,AngleObservation]
    confirmations:dict[str,Any]=Field(default_factory=dict)
    postureConfidence:float=Field(ge=0,le=1)
