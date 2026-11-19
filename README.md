# ERGO-PREDICT

Participative ergonomic decision-support prototype. The original Gemini dashboard is retained in `frontend/src/LegacyApp.tsx`; its untouched source backup is `ergo_predict_industrial_ergonomics_ai_dashboard.tsx.gemini-backup`.

## Requirements and startup

Use Node 20+ and Python 3.10–3.12 (MediaPipe wheel support depends on platform). Start the backend:

```bash
cd backend
python3.12 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements-vision.txt
python scripts/download_pose_model.py
uvicorn app.main:app --reload
```

The model download is optional for manual assessments but required for image, webcam, and video pose inference. The asset is stored at `backend/models/pose_landmarker_lite.task` and is ignored by Git. API docs: `http://127.0.0.1:8000/docs`; health: `/api/health`.

Use a clean virtual environment for this stack. MediaPipe installs `opencv-contrib-python`; the project pins that as its only OpenCV provider. Do not add `opencv-python` or `opencv-python-headless` to the same environment because all variants provide the same `cv2` namespace.

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL` to change the API base (default `http://localhost:8000`). Set `VITE_MOCK_MODE=false` to disable the Zustand store's mock-mode flag; existing legacy pages still use local demo state, so this flag does not make the whole dashboard backend-driven.

## Implemented scope and boundaries

- React + TypeScript + Vite production build, preserving the Gemini design, charts, stateful navigation, and embedded Three.js digital twin. The source is still a large legacy component rather than the complete modular page architecture originally proposed.
- Separate manual and automatic posture pages, local MediaPipe Tasks adapter, OpenCV video frame processing, 2D joint-angle geometry, visibility proxy, smoothing and posture labels. No camera stream is publicly exposed; uploads are temporarily written and removed. Video frames and webcam frames are not persisted by the application.
- RULA and REBA deterministic scoring tables and adjustment rules. Incomplete inputs yield `INCOMPLETE`; external force, load, coupling, muscle/activity, support and other unobservable factors require confirmation. Scores are screening outputs, not diagnoses.
- SQLite persistence for feedback, assessment and intervention records. Manager-facing feedback APIs return groups of at least three reports; no individual feedback retrieval route exists. This local prototype has no authentication or role control, and raw anonymous IDs/comments remain in the SQLite file, so do not put sensitive or identifiable information in comments.
- Backend task/workstation values and dashboard mock data are synthetic. Existing dashboard risk/exposure cards, task correlations, recommendation cards, ROI assumptions and what-if exposure graphics are prototype data/heuristics. The backend geometry comparison deliberately does not infer new RULA/REBA scores; follow-up measurements are required.
- The 3D twin and legacy page interactions compile, but were not browser-driven in the audit environment. The legacy dashboard is not comprehensively connected to the new REST APIs.

## Webcam and video workflow

Open **Automatic Posture Assessment**, select a camera view, then start the webcam (browser permission required) or choose a local video and process it. The webcam remains in the browser and sampled JPEG frames are sent to the local backend; uploaded videos are limited to 100 MB and 180 seconds, sampled up to 5 fps, and deleted after processing. A missing local model or MediaPipe installation is reported as unavailable; the application does not fabricate landmarks or scores.

The backend API can be tested without a model for validation and incomplete-input behavior. Run the model downloader only where network access is available. Current local audit environment did not have a usable MediaPipe installation or model asset, so actual webcam/video inference was not verified.

## Tests

```bash
cd backend
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 python -m pytest -q
python -m compileall -q app tests
cd ../frontend
npm install
npm test
npx tsc --noEmit
npm run build
```

Synthetic landmark fixtures are geometry tests, not worker samples. See [AUDIT_REPORT.md](AUDIT_REPORT.md), [AI_MODEL_AND_DATA_AUDIT.md](AI_MODEL_AND_DATA_AUDIT.md), and [FINAL_TEST_REPORT.md](FINAL_TEST_REPORT.md) for audit findings, test evidence, privacy limitations, assessment references, and known gaps.

## Ergonomic references

RULA: McAtamney & Corlett (1993), *Applied Ergonomics*, 24(2), 91–99; [Cornell RULA worksheet](https://ergo.human.cornell.edu/Pub/AHquest/RULAworksheet.pdf). REBA: Hignett & McAtamney (2000), *Applied Ergonomics*, 31, 201–205; [Cornell REBA scoring sheet](https://ergo.human.cornell.edu/Pub/AHquest/Cornell_REBA.pdf). See the AI/model audit for MediaPipe source and limitations.
