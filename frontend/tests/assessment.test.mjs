import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeManualAssessment, isCompleteAssessment } from '../src/utils/assessment.js';

test('manual assessment converts numeric strings and preserves explicit false', () => {
  const input = normalizeManualAssessment({upper_arm_angle:'22',force_load_kg:'0',wrist_deviation:'false',neck_twist:'true',wrist_twist:'mid_range'},'left');
  assert.equal(input.side,'left');
  assert.equal(input.upper_arm_angle,22);
  assert.equal(input.force_load_kg,0);
  assert.equal(input.wrist_deviation,false);
  assert.equal(input.neck_twist,true);
  assert.equal(input.wrist_twist,'mid_range');
});

test('blank manual inputs are omitted rather than treated as zero or false', () => {
  const input = normalizeManualAssessment({upper_arm_angle:'',force_load_kg:'',wrist_deviation:''},'right');
  assert.deepEqual(input,{side:'right'});
});

test('assessment is saveable only when both methods have complete numeric scores', () => {
  assert.equal(isCompleteAssessment({rula:{status:'COMPLETE',finalScore:4},reba:{status:'COMPLETE',finalScore:6}}),true);
  assert.equal(isCompleteAssessment({rula:{status:'INCOMPLETE',finalScore:null},reba:{status:'COMPLETE',finalScore:6}}),false);
  assert.equal(isCompleteAssessment({rula:{finalScore:4},reba:{status:'COMPLETE',finalScore:6}}),false);
});
