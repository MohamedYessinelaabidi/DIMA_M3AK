const numericFields = ['upper_arm_angle','lower_arm_angle','wrist_angle','neck_angle','trunk_angle','force_load_kg'];
const booleanFields = ['wrist_deviation','neck_twist','neck_side_bend','trunk_twist','trunk_side_bend','shoulder_raised','arm_abducted','arm_supported','across_midline','static_or_repetitive','shock_force','force_static_or_repeated','arm_out_to_side','unstable_or_rapid_change','repeated_small_range','sustained_over_minute'];

export function normalizeManualAssessment(values, side) {
  const result = { ...values, side };
  for (const key of numericFields) {
    if (result[key] === '' || result[key] === undefined || result[key] === null) delete result[key];
    else result[key] = Number(result[key]);
  }
  for (const key of booleanFields) {
    if (result[key] === '') delete result[key];
    else if (result[key] === 'true') result[key] = true;
    else if (result[key] === 'false') result[key] = false;
  }
  for (const [key, value] of Object.entries(result)) if (value === '') delete result[key];
  return result;
}

export function isCompleteAssessment(result) {
  return Boolean(result && ['rula','reba'].every(method =>
    Boolean(result[method]?.status) && result[method].status !== 'INCOMPLETE' && Number.isFinite(result[method]?.finalScore)
  ));
}
