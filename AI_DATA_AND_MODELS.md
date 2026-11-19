# AI Data and Models

## Pose model

ERGO-PREDICT uses Google's pretrained **MediaPipe Pose Landmarker Lite** task model, downloaded by `backend/scripts/download_pose_model.py` to `backend/models/pose_landmarker_lite.task`. The download URL is the versioned Google-hosted float16 model asset for task version 1. The model is not committed to the repository and is not trained or fine-tuned by ERGO-PREDICT. MediaPipe Pose Landmarker returns 33 body landmarks; model output visibility is used only as a confidence proxy.

Install and obtain the model:

```bash
cd backend
python3.12 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements-vision.txt
python scripts/download_pose_model.py
```

Python 3.10–3.12 is recommended for the current MediaPipe wheel ecosystem. The repository has not verified installation on Python 3.13/3.14.

## Dataset and training

There is no ERGO-PREDICT training dataset, no custom training, and no workplace video dataset in this repository. The application does not upload images to a paid AI API. Test skeleton landmarks are synthetic, manually authored fixtures clearly identified in the tests. The existing dashboard demo worker counts, workstation values, discomfort reports, and trend series are synthetic.

The MediaPipe task's linked documentation describes its outputs and API but does not provide enough detail to attribute a specific training dataset or calculate this application's ergonomic accuracy. ERGO-PREDICT does not make claims about model training data, worker-population representativeness, or diagnostic performance.

## What is estimated, rule-based, and manually confirmed

| Output | Source | Classification |
|---|---|---|
| 33 body landmark coordinates | Pretrained MediaPipe inference | AI-estimated |
| Joint angles | Vector angle from landmark coordinates and frame dimensions | Deterministic estimate |
| Landmark confidence | MediaPipe visibility minimum and derived joint confidence | AI confidence proxy, not a confidence interval |
| Temporal stabilization | EMA and jump rejection | Deterministic |
| Posture labels | Thresholds over estimated angles | Deterministic screening rules |
| RULA/REBA posture category and final score | Method scoring tables and adjustments | Deterministic method calculation |
| Load, force, coupling, muscle use/activity, support, twist | Ergonomist confirmation fields | Manually supplied |
| Overall dashboard demo risk values | Hardcoded synthetic prototype data | Synthetic demo |
| What-if exposure | Prototype heuristic | Simulated estimate; not a RULA/REBA score |

Automatic assessments use status labels that distinguish incomplete input from video estimates combined with manually confirmed factors. The API does not silently substitute neutral/zero values for missing factors.

## Limits

A single uncalibrated RGB camera cannot reliably infer depth, actual force/load, grip quality, muscle-use timing, duty cycle, support/contact, wrist pronation, or all occluded joints. Angle measurements are image-plane observations; a declared sagittal side view is required for the current sagittal trunk/neck inputs, and even then results need assessor review. A front view can help inspect visible asymmetry but does not qualify as a substitute sagittal measurement. Do not interpret results as a diagnosis or as proof of causation.

## References

- Google AI Edge, [MediaPipe Pose Landmarker guide](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) and [Python Tasks Vision API](https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision).
- McAtamney & Corlett (1993), RULA, *Applied Ergonomics*, 24(2), 91–99. The scoring worksheets and table stages are documented in [Cornell's RULA worksheet](https://ergo.human.cornell.edu/Pub/AHquest/RULAworksheet.pdf).
- Hignett & McAtamney (2000), REBA, *Applied Ergonomics*, 31, 201–205. The tables, activity adjustments and risk bands are documented in [Cornell's REBA scoring sheet](https://ergo.human.cornell.edu/Pub/AHquest/Cornell_REBA.pdf).
