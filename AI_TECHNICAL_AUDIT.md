# ERGO-PREDICT AI Technical Audit

Audit date: 2026-11-19. This is the consolidated technical status after the CV/API implementation and test repairs.

## Model and dataset facts

- Before the posture-analysis work, the Gemini frontend used no trained AI model. Its dashboards, recommendation cards and simulator values were deterministic or hardcoded demo content.
- The current optional pose pipeline targets Google's pretrained MediaPipe Pose Landmarker Lite task model, float16, version 1. The downloader is present; the binary is not checked into source. No custom training, fine-tuning, training data or ERGO-PREDICT validation dataset exists.
- The audit runtime had no usable MediaPipe installation or model file. Model initialization and real video/webcam inference could not be run. This is an explicit unavailable capability, not a passing model test.
- Existing dashboard/task/workstation/feedback history is synthetic. Test landmark fixtures are hand-authored synthetic points, not worker observations.

## What executes deterministically

- Joint-angle geometry computes image-plane vector angles from landmark coordinates. Visibility is treated as a reliability proxy. EMA smoothing/jump rejection and posture labels are deterministic rules.
- RULA/REBA are deterministic lookup-table assessment methods, not AI. The implementation requires necessary observations and manual factors and reports `INCOMPLETE` rather than assuming neutral values. A REBA published reference example and boundary conditions are tested; broad ergonomic validation remains outstanding.
- Backend recommendation rules respond to aggregated reports and discomfort threshold. Backend simulation returns changed configuration values and a reassessment request, not new scores. ROI is arithmetic over user-entered assumptions.
- The legacy dashboard continues to show synthetic heuristic exposure and local simulation output. Do not interpret these as real risk measurement, posture assessment or learning-model prediction.

## Current verification

- `backend/tests`: 33 passing, including synthetic geometry, scoring, input validation, SQLite/API integration, recommendation variation, and simulation behavior. No model-backed test was run.
- Frontend TypeScript type-check and production Vite build pass. Browser, WebGL and camera behavior were not browser-tested in the restricted execution environment.
- See [AI_MODEL_AND_DATA_AUDIT.md](AI_MODEL_AND_DATA_AUDIT.md) for model/data sources and limitations; [AUDIT_REPORT.md](AUDIT_REPORT.md) for architecture, risk/privacy findings; [FINAL_TEST_REPORT.md](FINAL_TEST_REPORT.md) for component statuses and exact commands.
