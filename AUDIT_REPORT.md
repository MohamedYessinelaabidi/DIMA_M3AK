# ERGO-PREDICT Complete Project Audit

Audit performed 2026-11-19 in the provided workspace. Results describe this checkout and execution environment, not a production deployment.

## Scope and structure

| Area | Inventory and observed behavior |
|---|---|
| Frontend | `frontend/` React 18, TypeScript, Vite 6, Tailwind CSS, Zustand, Recharts, Lucide, Three.js, React Three Fiber and Drei. Entry point is `src/main.tsx`; it mounts the 4,000+ line `LegacyApp.tsx` and uses an in-component state/switch navigator. React Router is installed but unused. The original TSX backup is at repository root. |
| Assessment UI | `AssessmentPage.tsx` sends manual RULA/REBA requests. `AutomaticPostureAssessment.tsx` provides webcam/video capture, skeleton overlay, landmarks, angle reliability labels, manual confirmation, score results and saved history. |
| Frontend services/state | `src/services/api.ts` wraps a subset of workstation/assessment/feedback/simulation/ROI APIs. `src/store/appStore.ts` exposes a mock-mode flag but most legacy pages still use embedded data and local component state. |
| Backend | FastAPI application in `backend/app/main.py`; schemas in `app/schemas`; services for RULA, REBA, pose estimation, joint angles, posture classification, video, aggregation, trends, recommendations, simulation and ROI. SQLite is a small stdlib `sqlite3` layer in `app/database/store.py`. |
| API | `/api/health`; workstation list/detail; task and body-zone analysis; feedback submit/aggregate; manual RULA/REBA; automatic assessment/confirm/history; image/video pose analysis/status; simulation; recommendations; interventions; ROI; demo trend. The routes are registered in one main module, not split into router modules. Swagger is supplied by FastAPI. |
| Persistence | SQLite tables for feedback, assessment JSON records and intervention JSON records. Feedback is aggregated with a minimum group size of 3 on API responses. A feedback row stores anonymous ID and optional free-text comment. Assessment/intervention history persists locally. |
| AI/model | Optional Google MediaPipe Pose Landmarker Lite task model; there is a downloader but no model binary in the repository. No custom model, fine-tuning or ERGO-PREDICT training dataset exists. Model-backed inference was unavailable in this environment. |
| Demo data | Existing dashboard body zones, charts, alerts, task metrics, ROI assumptions and legacy what-if exposures are hardcoded synthetic/local data. Backend workstation/task catalog is explicitly marked synthetic. Test landmark fixture is synthetic geometry only. |

## Functionality actually verified

- `npm install` completed. `npx tsc --noEmit` completed. `npm run build` completed: 1,997 modules transformed and production bundle emitted. Build warns that the JavaScript chunk is about 1.23 MB minified.
- 33 Python tests pass; `compileall` passes. Tests cover table boundaries/reference cases, missing and invalid inputs, joint angle geometry, low visibility, smoothing, feedback aggregation, trend behavior, recommendations, SQLite persistence, API validation/responses, CORS and incomplete simulation behavior.
- Uvicorn logged successful application startup. ASGI integration tests exercised endpoint responses without opening a network socket. Direct localhost socket access was denied by the execution sandbox, so Swagger was not opened over HTTP.
- Database initialization, CRUD and reopening the same SQLite file are covered by tests. The model download and real pose inference are not.
- Full browser interaction and visual inspection were not available. Vite could not bind a local port (`EPERM`), and the installed Snap Chromium could not create its runtime directory. Therefore navigation, browser console, responsive layout, camera permission, chart rendering, WebGL rendering/controls and actual upload preview were not claimed as passed.

## Findings and repairs made

| Finding | Repair / remaining state |
|---|---|
| No persistent feedback/intervention/assessment storage was present in the earlier implementation. | Added SQLite persistence using stdlib; feedback response is aggregate-only and suppresses groups under 3. Verified with endpoint and reopen tests. Existing free-text comments and anonymous identifiers are still stored locally; no authentication, access roles or retention policy exists. |
| Previously absent task/body-zone and station-level recommendation/history APIs blocked the demonstration workflow. | Added task/body-zone analysis, station recommendations, intervention creation/listing, assessment station history, simulation alias and health status. Data sources remain one-station synthetic demo plus submitted feedback. |
| A weak test did not exercise a verified complete REBA example or neck extension boundaries. | Added the published REBA example (A=8/B=5/C=10/final=11) and extension boundary checks. Fixed REBA and RULA extension categories that were being treated as neutral. All tests pass after repair. |
| Malformed upload bytes were passed toward native video codecs. | Added early PNG/JPEG signature checks and MP4/WebM/AVI container signature checks; rejected invalid formats return 415. Upload is capped and temp file removed in `finally`. |
| Video playback frame selection changed the skeleton overlay but left joint-angle/score inputs showing the first selected frame. | Frame selection now updates displayed pose and angles and clears stale assessment confirmation before reassessment. TypeScript/build pass. This UI behavior could not be browser-verified here. |
| SQLite connections used the sqlite context manager, which commits but does not close the handle. | Added a closing transaction/session helper with commit/rollback. Tests pass. |
| Documentation said feedback/history were in-memory and suggested broad completion. | README now describes SQLite persistence, remaining local/mock behavior, setup, model requirement, test commands and privacy limits. |

## Missing or partial functionality

1. **Pose inference unavailable here:** MediaPipe was not installed/importable in the active runtime and `pose_landmarker_lite.task` is absent. Installation/model download depends on supported Python and network. Real webcam and real video were not run; API correctly reports model unavailable for supported input.
2. **Frontend architecture is transitional:** the Gemini app remains a large monolith; React Router is unused, no modular page architecture was completed, and many business/domain calculations remain embedded in UI code.
3. **REST integration is partial:** only manual assessment and automatic posture UI use the backend. The original dashboard, body map, tasks, recommendation cards, simulator, intervention manager and ROI still largely operate on synthetic data/local state. New services do not yet cover every requested API operation.
4. **Digital twin integration is partial:** an existing Three.js scene and local controls are present, not replaced with R3F. The legacy simulator is a heuristic UI demo; it does not send all configuration changes through the backend simulation route. Backend simulation only reports changed parameters and requests reassessment; it does not estimate new angles or scores.
5. **Recommendations are limited:** API recommendations use deterministic feedback thresholds, but do not yet correlate persisted tasks, workstation geometry, RULA/REBA results and prior interventions. Legacy recommendation cards are static synthetic demo content. Confidence is explicitly `NOT_ESTIMATED` in the rule output.
6. **Trends are limited:** deterministic trend function accepts period counts, but `/api/trends/demo` returns a hardcoded synthetic series; historical feedback is not bucketed by time period into a live trend endpoint.
7. **Ergonomic validation:** score lookup matrices and a published REBA vector are tested. There is not a broad independent ergonomist-reviewed reference vector suite for every RULA/REBA boundary or configuration. Do not represent current tests as clinical validation.
8. **Privacy/security:** no login, authorization/roles, audit log, request rate limit, encrypted DB, or retention/deletion workflow. Video is not saved, but SQLite raw worker comments and anonymous IDs are locally present. CORS allows only localhost/127.0.0.1:5173. Not suitable for sensitive production data without controls.
9. **Testing gaps:** a small Node unit suite now checks assessment input normalization and save eligibility; no React component or browser automation suite exists. Browser execution, camera hardware, actual video decoder on a sample clip, installed MediaPipe runtime/model, and 3D interactions were not testable in this environment.

## Dependency/configuration observations

- Frontend declared dependencies installed and build successfully. `npm install` reported esbuild's install script blocked by npm policy; it did not prevent the build in this environment.
- Python `requirements.txt` declares FastAPI/Uvicorn/Pydantic/NumPy/OpenCV/pytest/httpx. OpenCV is pinned to one `opencv-contrib-python` distribution because MediaPipe depends on that `cv2` provider; do not install `opencv-python` or `opencv-python-headless` alongside it. Vision dependency is separated into `requirements-vision.txt` with MediaPipe. There is no SQLAlchemy dependency; persistence intentionally uses stdlib SQLite.
- The active Python 3.14 environment has unrelated ROS plugin packages that cause `pip check` / pytest auto-plugin loading failures (`osrf_pycommon` absent). Tests pass with `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1`. A clean project venv should avoid these ROS-specific plugin collisions.
- No committed `.env` or credentials were found in the inspected root tree. `.env`, SQLite files, venvs, node_modules, build output and task model files are ignored.
- Model downloader fetches the Google versioned task asset without a checksum/signature verification step. Pinning and verifying an expected checksum is a hardening item.

## Scoring and CV behavior

RULA and REBA calculations are deterministic lookup-table procedures, not AI. A missing required score input yields `INCOMPLETE`. Automatic conversion to ergonomic scoring only passes sagittal estimates if a side view is declared, posture-angle confirmation is checked, and angle confidence is at least 0.70. Force/load, support, wrist twist/deviation, coupling, activity and other unobservable variables remain manual. MediaPipe's visibility is a proxy, not an angular confidence interval. Single-view image-plane geometry is not validated biomechanical measurement.

See [AI_MODEL_AND_DATA_AUDIT.md](AI_MODEL_AND_DATA_AUDIT.md) for model/data status and [FINAL_TEST_REPORT.md](FINAL_TEST_REPORT.md) for exact test commands/results and component-level status.
