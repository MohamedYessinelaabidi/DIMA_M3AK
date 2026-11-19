# AI Model and Data Audit

Audit date: 2026-11-19.

## Model inventory

| Item | Finding |
|---|---|
| Human pose model | Google MediaPipe Pose Landmarker Lite, float16 task asset, version 1 (`pose_landmarker_lite/float16/1/pose_landmarker_lite.task`). |
| Source | The project downloader references Google's versioned Cloud Storage asset URL; the MediaPipe Tasks API is used by `backend/app/services/pose_estimation.py`. |
| Pretrained/custom | Pretrained upstream model. ERGO-PREDICT has not trained, fine-tuned or validated a model. |
| Asset in repository/runtime | The downloader exists; the `.task` binary is not committed. In this audit environment the task asset was absent. MediaPipe was unavailable in the active Python runtime. Inference and webcam/video model loading were therefore not executed. |
| Libraries | `opencv-python-headless`, NumPy and optional `mediapipe` are declared in `backend/requirements*.txt`. FastAPI/Pydantic serve the API. No paid or external LLM service is called. |
| Training data | No ERGO-PREDICT worker video dataset, annotated ergonomics dataset, training pipeline, trained checkpoint, or model validation dataset exists in this repository. MediaPipe returns 33 pose landmarks; its upstream model is treated as pretrained. This audit does not infer or name undocumented model training data. |

The downloader currently retrieves the versioned upstream asset without checksum verification. The model source/version is pinned by URL path but no integrity digest is recorded.

## Data present

- Synthetic dashboard data in `frontend/src/LegacyApp.tsx`: body-zone report counts, exposure indicators, tasks, timeline charts, alerts, interventions, scenario impacts and ROI assumptions.
- Synthetic backend workstation/task catalog in `backend/app/main.py`; it is marked `synthetic demo`.
- Synthetic test landmark fixtures created in `backend/tests/test_pose_pipeline.py`; these are mathematical fixtures, not images or worker video.
- Feedback submitted locally is persisted by SQLite. It may include a user-entered anonymous ID and free-text comment. There is no sample employee/workplace dataset bundled.
- No saved camera images/video or model training samples are stored by the pose-processing code. Video bytes are temporarily written for OpenCV decoding and removed after the request; webcam frames are handled transiently.

## Output origin and classification

| Output | How produced | Classification / limitation |
|---|---|---|
| Body landmarks | MediaPipe inference, when the optional dependency and model asset load | AI-estimated, not executed in this audit. |
| Landmark reliability | MediaPipe visibility values and their minimum across an angle's landmarks | Proxy only; not calibrated probability or measurement interval. |
| Joint angles | Vector geometry from 2D landmarks, including vector angle and image-plane inclination | Deterministic calculation over AI-estimated coordinates; not calibrated 3D biomechanics. |
| Temporal smoothing | EMA and a configurable jump guard | Deterministic; a sudden real movement can also be rejected as a jump. |
| Elevated arms, trunk/neck bending, elbow/knee flexion, shoulder asymmetry | Threshold rules applied to calculated angles | Deterministic posture labels; not medical conditions. |
| RULA/REBA group and final scores | Method scoring tables and documented adjustment rules | Deterministic ergonomic screening calculation, not ML. Missing required inputs return `INCOMPLETE`. |
| Force/load, support, coupling, wrist twist, muscle-use/activity and related factors | Ergonomist/manual confirmation form | Manual inputs. Camera does not fill them with neutral/zero defaults. |
| Dashboard risk and charts | Hardcoded synthetic demo data in the Gemini prototype | Mock/demo content, not measurements or AI predictions. |
| Recommendations | Current backend rule for aggregated report count/discomfort; legacy page also has static demo recommendations | Deterministic limited rule. Not a trained AI recommender; association does not prove causation. |
| What-if | Legacy frontend heuristic and backend changed-parameter comparison | Simulation only. Backend returns no new scores and requires reassessment. |
| ROI | Arithmetic over user-entered cost and savings assumptions | Estimate; not company financial data. |

## Current assessment path

`Image/video bytes → MediaPipe landmarks (when installed) → 2D vector angles → EMA smoothing → posture labels → assessor confirms angles and unavailable factors → RULA/REBA tables`.

Automatic scoring only maps posture observations when `cameraView` is `side`, `postureAnglesConfirmed` is true and the relevant angle confidence is at least 0.70. RULA/REBA still require all method-specific manual/observed factors; no score is emitted if any required value is missing. A generated result is classified as estimated posture plus confirmed manual factors; it is not a fully measured objective workplace assessment.

## Known limitations

- A single uncalibrated camera view cannot robustly resolve depth, occluded joints, wrist pronation/twist, hand grip/coupling, force/load, support/contact, muscle use, repetition or task duration.
- MediaPipe visibility is not an angle error bound. Clothing, camera perspective, lighting, motion blur, person orientation and occlusion affect quality.
- Angle calculations are 2D image-plane geometry. Declaring a side view is a user assertion, not automatic camera calibration.
- Frame sampling can miss short-lived posture peaks. The pipeline samples video up to 5 fps and caps duration/frame count.
- No ergonomic accuracy, clinical accuracy, sensitivity/specificity, worker-population validity or causal effect has been established.
- No model-backed image/video, webcam or pose end-to-end test could be run in this execution environment. Synthetic fixtures establish geometry behavior only.

## References

- Google AI Edge, [MediaPipe Pose Landmarker guide](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) and [Python Tasks Vision API](https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision).
- McAtamney & Corlett (1993), RULA, *Applied Ergonomics*, 24(2), 91–99; [Cornell scoring worksheet](https://ergo.human.cornell.edu/Pub/AHquest/RULAworksheet.pdf).
- Hignett & McAtamney (2000), REBA, *Applied Ergonomics*, 31, 201–205; [Cornell scoring sheet](https://ergo.human.cornell.edu/Pub/AHquest/Cornell_REBA.pdf).
