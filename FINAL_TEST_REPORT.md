# ERGO-PREDICT Final Test Report

Run date: 2026-11-19. Only executed results are marked as passing. Browser, hardware and model-dependent tests that were unavailable are explicitly not passed.

## Component summary

| Component | Status | Test performed | Result |
|---|---|---|---|
| React frontend | PARTIAL | `npm test`, `npm install`, Vite production build | 3 Node unit tests pass; build transformed 1,999 modules. Bundle warning: ~1.24 MB minified. UI not opened in a browser. |
| TypeScript | PASS | `npx tsc --noEmit` | No diagnostics. |
| FastAPI backend | PASS | `uvicorn app.main:app --reload` startup | Application startup completed and server logged listening at 127.0.0.1:8000. Direct socket request was denied by sandbox `EPERM`; HTTP server was stopped after check. |
| API endpoints | PARTIAL | 33-test ASGI integration suite | Covered health, workstation/task/body-zone, feedback, RULA/REBA, pose status and invalid/missing-model requests, automatic/confirm/history, simulation, recommendations, interventions, ROI, validation and CORS. No live network HTTP/Swagger session due socket restriction. |
| Database | PASS | SQLite initialization, CRUD, persistence after reopening, aggregation | Tests pass. SQLite is a local file; no migration framework or production database setup. |
| RULA | PARTIAL | Scoring table lookup, neutral end-to-end score, missing inputs, angle bounds, extension category | Tests pass and final scores stay table-limited. No broad independently ergonomist-reviewed reference vector suite. |
| REBA | PASS (prototype method tests) | Official table cells, missing inputs, edge cases, published example | Test reproduces Hignett & McAtamney example: Group A 8, B 5, C 10, final 11/action 4. Not clinical validation. |
| MediaPipe | NOT AVAILABLE | `/api/pose/status`, dependency and model-file audit | Active environment has no usable installed/importable MediaPipe + model asset. Model loading was not executed. |
| Pose detection | NOT RUN | Sample video/webcam | No usable model asset, sample clip or accessible camera. No claim of detection pass. |
| Joint angles | PASS (synthetic geometry) | Synthetic landmarks, vector right angle, missing/low visibility, non-finite points, smoothing and jump guard | 2D math and error behavior tests pass; fixtures are not people or model output. |
| Automatic assessment | PARTIAL | API pipeline with supplied angle payloads and explicit manual factors | Table scoring, incomplete status and missing-input rejection pass. MediaPipe→scorer end-to-end was not run. |
| Digital twin | NOT BROWSER-VERIFIED | TypeScript/Vite build and source inspection | Existing Three.js scene remains in the legacy UI. WebGL load, controls, responsive layout and overlay were not exercised in a browser. |
| Simulation | PARTIAL | API configuration comparison | Changed parameters returned; no RULA/REBA scores fabricated; reassessment warning present. Frontend's local heuristic interaction was not browser-tested. |
| Recommendations | PASS (limited rules) | Variation test for report thresholds, API shape | Output changes deterministically when synthetic aggregate input crosses rule threshold. Does not yet correlate all listed assessment/task/intervention sources. |
| Privacy | PARTIAL | Route/data response inspection and group-suppression tests | No individual feedback retrieval route; responses suppress groups under three; no frame persistence. However raw anonymous IDs/comments are stored in SQLite and there is no authentication, role access or retention policy. |

## Commands and outputs

Backend tests (using the provided environment's root venv; plugin autoload disabled because unrelated ROS pytest plugins fail to import `osrf_pycommon`):

```bash
cd backend
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTHONPATH="$PWD" ../.venv/bin/python -m pytest -q -p no:cacheprovider
../.venv/bin/python -m compileall -q app tests
```

Observed: **33 passed in 0.34s** (latest complete run). `compileall` exited successfully.

Frontend:

```bash
cd frontend
npm install
npm test
npx tsc --noEmit
npm run build
```

Observed: install up to date; 3 Node unit tests pass; TypeScript exited successfully; Vite transformed 1,999 modules and built successfully. npm warned the esbuild install script was blocked by local npm policy; build still succeeded.

Backend startup:

```bash
cd backend
uvicorn app.main:app --reload
```

Observed startup log: application startup complete and Uvicorn listening. Requesting `http://127.0.0.1:8000/api/health` from a separate process failed with `PermissionError: [Errno 1] Operation not permitted` because this execution environment blocks local sockets. Endpoint responses were instead exercised using HTTPX's in-process ASGI transport. Therefore live `/docs` was not claimed verified.

## Repairs made and rechecked

- Added SQLite persistence and health status, task/body-zone routes, intervention records and history, station-level recommendations and assessment history.
- Closed database connections deterministically and avoided disclosing the absolute DB path in health responses.
- Corrected RULA neck extension and REBA neck extension scoring categories; tests now assert extension boundaries and a REBA published worked example.
- Added input signature rejection for unsupported image/video bytes before native codec processing.
- Video-frame selection now updates displayed pose/angles and clears stale score confirmation state.
- Added the automatic assessment page to existing navigation and unit-tested manual input normalization and save eligibility.
- Disabled webcam/video processing while model status is unavailable and stop the webcam loop on a terminal 503, preventing repeated frame-upload failures.
- Changed backend OpenCV dependency to `opencv-contrib-python` (the distribution MediaPipe depends on) so requirements no longer request both the headless and contrib `cv2` packages.
- Re-ran the backend suite after repairs (33 pass), Python compile check, TypeScript check, and Vite build.

## Failures observed during repair

- The neck-extension regression initially failed because the REBA engine treated extension as neutral. The RULA/REBA categories were corrected; boundary tests and the 33-test backend suite now pass.
- The new frontend eligibility test initially allowed a numeric score with a missing status. The helper now requires both statuses and finite scores; all 3 frontend tests pass.
- An invalid-video fixture reached OpenCV's native decoder and stalled in this environment. Container signature validation now rejects unsupported payloads before decode; the invalid-video test returns 415 and passes.
- The user's pip output showed both OpenCV distributions installed and unrelated ROS `launch-ros` requirements missing. Requirements now request a single compatible OpenCV provider; the `launch-ros` warning is external to ERGO-PREDICT. A clean-environment install was not run from this restricted workspace.

## User run instructions

Backend with model-backed CV (Python 3.10–3.12 recommended):

```bash
cd backend
python3.12 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements-vision.txt
python scripts/download_pose_model.py
uvicorn app.main:app --reload
```

The model is downloaded from Google's versioned MediaPipe Lite task URL to `backend/models/pose_landmarker_lite.task`; download needs network access. Manual assessment and non-CV API tests do not need this model.

Frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **Automatic Posture Assessment**. For webcam, select a view, start camera, and grant browser permission. For video, select a local file (up to 100 MB and 180 seconds) and process it. The API deletes its temporary video file after the request.

## Remaining limits and scope truth

**Implemented:** React/Vite build, manual RULA/REBA API forms, deterministic table engines, local SQLite persistence, feedback aggregate response, synthetic task/workstation APIs, MediaPipe adapter code, image/video request pipeline code, mathematical angle extraction and smoothing, rule recommendations, safe geometry comparison, ROI arithmetic, and test coverage listed above.

**Partially implemented:** CV automatic scoring is conditional on an upstream pretrained model asset, camera view, quality and manual confirmations; live browser flow is unverified. SQLite APIs exist, but most original dashboard features remain local. Recommendations use only limited feedback rules. Simulation does not infer posture from geometry. Intervention follow-up records are fields in creation payloads, not a complete workflow. Privacy controls are prototype-level.

**Still mock/demo:** existing dashboard charts, risk/exposure values, synthetic body-zone counts, task associations, most recommendation cards, legacy simulation impact graphics, and ROI assumptions. They are not real workplace measures or model-generated predictions. RULA/REBA are never generated from these mock values.

No camera/video/model-backed test passed because the necessary model/runtime/hardware were unavailable. A supported Python setup with a successful model download and a browser with camera permission is needed to complete those tests.
