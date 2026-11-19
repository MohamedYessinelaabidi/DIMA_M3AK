from app.schemas.assessment import AssessmentInput
from app.services.rula_engine import score_rula
from app.services.reba_engine import score_reba
from app.services.aggregation import aggregate_feedback, detect_trend
from app.services.simulation_engine import compare_configurations

def test_incomplete_assessment_never_scores():
    p=AssessmentInput(side='left')
    assert score_rula(p)['status']=='INCOMPLETE'
    assert score_reba(p)['finalScore'] is None

def test_feedback_aggregation():
    rows=[{'bodyZone':'Shoulder','side':'left','taskId':'insert','discomfort':6},{'bodyZone':'Shoulder','side':'left','taskId':'insert','discomfort':8}]
    assert aggregate_feedback(rows)[0]['averageDiscomfort']==7

def test_trend_requires_multiple_periods():
    assert detect_trend([{'reports':1}])['status']=='INSUFFICIENT_DATA'
    assert detect_trend([{'reports':3},{'reports':7}])['status']=='INCREASING'

def test_geometry_change_does_not_fabricate_assessment():
    x=compare_configurations({'reach':55},{'reach':40})
    assert x['rula'] is None and x['reba'] is None and x['status']=='INCOMPLETE'

def test_recommendations_are_deterministic_and_respond_to_aggregates():
    from app.services.recommendation_engine import recommendations
    low=recommendations([{'bodyZone':'Shoulder','side':'left','taskId':'insert','reports':2,'averageDiscomfort':7}])
    elevated=recommendations([{'bodyZone':'Shoulder','side':'left','taskId':'insert','reports':4,'averageDiscomfort':7}])
    assert low==[] and len(elevated)==1
    assert elevated[0]['priority']=='HIGH' and elevated[0]['causality'].startswith('Association only')

def test_rula_official_table_lookup_and_action_level():
    from app.services.rula_engine import score_rula, TABLE_A, TABLE_B, TABLE_C
    assert TABLE_A[0][0][0] == 1
    assert TABLE_B[0][0][0] == 1
    assert TABLE_C[0][0] == 1
    p=AssessmentInput(side='left',upper_arm_angle=0,lower_arm_angle=90,wrist_angle=0,wrist_deviation=False,wrist_twist='mid_range',neck_angle=0,neck_twist=False,neck_side_bend=False,trunk_angle=0,trunk_twist=False,trunk_side_bend=False,leg_support='supported_balanced',shoulder_raised=False,arm_abducted=False,arm_supported=False,across_midline=False,static_or_repetitive=False,force_load_kg=0,shock_force=False,force_static_or_repeated=False,arm_out_to_side=False)
    r=score_rula(p)
    assert 1<=r['finalScore']<=7 and r['actionLevel']==1

def test_reba_official_table_lookup_and_incomplete_inputs():
    from app.services.reba_engine import score_reba,TABLE_A,TABLE_B,TABLE_C
    assert TABLE_A[0][0][0]==1 and TABLE_B[0][0][0]==1 and TABLE_C[0][0]==1
    p=AssessmentInput(side='left',upper_arm_angle=0,lower_arm_angle=90,wrist_angle=0,wrist_deviation=False,neck_angle=0,neck_twist=False,neck_side_bend=False,trunk_angle=0,trunk_twist=False,trunk_side_bend=False,leg_support='supported_balanced',force_load_kg=0,shock_force=False,coupling='good',unstable_or_rapid_change=False,repeated_small_range=False,sustained_over_minute=False,shoulder_raised=False,arm_abducted=False,arm_supported=False,unilateral_weight_bearing=False,knee_flexion_angle=0)
    r=score_reba(p)
    assert 1<=r['finalScore']<=15 and r['groupC']>=1


def test_reba_published_physiotherapist_example():
    """Hignett & McAtamney 2000 example: A=8, B=5, C=10, activity=1, final=11."""
    p=AssessmentInput(side='right',upper_arm_angle=70,lower_arm_angle=30,wrist_angle=0,wrist_deviation=False,neck_angle=30,neck_twist=False,neck_side_bend=False,trunk_angle=70,trunk_twist=True,trunk_side_bend=False,leg_support='supported_balanced',force_load_kg=0,shock_force=False,coupling='fair',unstable_or_rapid_change=False,repeated_small_range=False,sustained_over_minute=True,shoulder_raised=False,arm_abducted=False,arm_supported=False,unilateral_weight_bearing=False,knee_flexion_angle=70)
    r=score_reba(p)
    assert (r['groupA'],r['groupB'],r['groupC'],r['finalScore'])==(8,5,10,11)
    assert r['riskLevel']=='very high' and r['actionLevel']==4

def test_rula_requires_force_twist_and_joint_inputs():
    p=AssessmentInput(side='right',upper_arm_angle=0,lower_arm_angle=90,wrist_angle=0,wrist_deviation=False,neck_angle=0,neck_twist=False,neck_side_bend=False,trunk_angle=0,trunk_twist=False,trunk_side_bend=False,leg_support='supported_balanced',shoulder_raised=False,arm_abducted=False,arm_supported=False,across_midline=False,static_or_repetitive=False,force_load_kg=None,shock_force=False,force_static_or_repeated=False,arm_out_to_side=False)
    result=score_rula(p)
    assert result['status']=='INCOMPLETE' and 'force_load_kg' in result['missingInputs'] and 'wrist_twist' in result['missingInputs']

def test_assessment_schema_rejects_joint_angles_outside_bounds():
    import pytest
    from pydantic import ValidationError
    with pytest.raises(ValidationError): AssessmentInput(side='left',upper_arm_angle=181)
    with pytest.raises(ValidationError): AssessmentInput(side='left',force_load_kg=-1)


def test_reba_reference_extension_and_neutral_boundaries():
    from app.services.reba_engine import score_reba
    from app.services.rula_engine import score_rula
    def make(neck,trunk):
        return AssessmentInput(side='left',upper_arm_angle=0,lower_arm_angle=90,wrist_angle=0,wrist_deviation=False,neck_angle=neck,neck_twist=False,neck_side_bend=False,trunk_angle=trunk,trunk_twist=False,trunk_side_bend=False,leg_support='supported_balanced',force_load_kg=0,shock_force=False,coupling='good',unstable_or_rapid_change=False,repeated_small_range=False,sustained_over_minute=False,shoulder_raised=False,arm_abducted=False,arm_supported=False,unilateral_weight_bearing=False,knee_flexion_angle=0)
    assert score_reba(make(-10,0))['breakdown']['neck']==2  # REBA assigns extension to the higher neck category.
    assert score_reba(make(0,1))['breakdown']['trunk']==2  # Nonzero 0-20 degree flexion.
    rp=make(-10,0).model_copy(update={'wrist_twist':'mid_range','across_midline':False,'static_or_repetitive':False,'force_static_or_repeated':False,'arm_out_to_side':False})
    assert score_rula(rp)['breakdown']['neck']==4  # RULA has a distinct neck extension category.
