from pydantic import BaseModel, Field, ConfigDict
from typing import Literal

class AssessmentInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    side: Literal['left','right']
    upper_arm_angle: float | None = Field(None, ge=-180, le=180)
    lower_arm_angle: float | None = Field(None, ge=0, le=180)
    wrist_angle: float | None = Field(None, ge=-90, le=90)
    wrist_deviation: bool | None = None
    wrist_twist: Literal['mid_range','end_range'] | None = None
    neck_angle: float | None = Field(None, ge=-90, le=90)
    neck_twist: bool | None = None
    neck_side_bend: bool | None = None
    trunk_angle: float | None = Field(None, ge=-120, le=120)
    trunk_twist: bool | None = None
    trunk_side_bend: bool | None = None
    leg_support: Literal['supported_balanced','unsupported_unbalanced'] | None = None
    shoulder_raised: bool | None = None
    arm_abducted: bool | None = None
    arm_supported: bool | None = None
    across_midline: bool | None = None
    static_or_repetitive: bool | None = None
    force_load_kg: float | None = Field(None, ge=0, le=200)
    shock_force: bool | None = None
    coupling: Literal['good','fair','poor','unacceptable'] | None = None
    unstable_or_rapid_change: bool | None = None
    repeated_small_range: bool | None = None
    sustained_over_minute: bool | None = None

    force_static_or_repeated: bool | None = None
    arm_out_to_side: bool | None = None
    unilateral_weight_bearing: bool | None = None
    knee_flexion_angle: float | None = Field(None, ge=0, le=180)
