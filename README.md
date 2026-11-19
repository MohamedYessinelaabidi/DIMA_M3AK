# ERGO-PREDICT

**AI-Powered Ergonomic Digital Twin for Predictive Workplace Risk Prevention**

ERGO-PREDICT is a privacy-first, human-centered ergonomic decision-support prototype designed to prevent multisite musculoskeletal disorders (TMS / MSDs) in manual industrial workstations. Built around the automotive wiring harness assembly reference case (LEONI workstation brief: ~430 wires/harness, ~13 harnesses/hour, ~276 s takt time), it connects four dimensions — **Body**, **Task**, **Workstation**, and **Ergonomic Exposure** — to move workplace prevention from occasional observation to continuous, participative improvement.

## Core Principles

- **Human-Centered:** No worker is replaced and no task is eliminated through automation. Operators stay in control and participate voluntarily in workstation improvements.
- **Privacy-by-Design:** Individual health information belongs strictly to the worker and authorized occupational health professionals. Managers see only aggregated workstation-level trends. No productivity scoring, no worker surveillance, local video processing wherever possible, and no identifiable video frames stored by default.
- **Scientific Honesty:** Computer vision assists posture screening and does not diagnose medical conditions or replace certified ergonomic assessments. Non-visual factors (force/load, coupling, wrist twist, static/repetitive activity, occluded joints) require explicit human confirmation before producing complete RULA/REBA scores.

## Key Modules & Prototype Status

| Module | Status | What It Does |
| :--- | :--- | :--- |
| **Automatic Posture Assessment** | Working prototype | Local webcam/video capture, MediaPipe Pose landmark detection, real-time joint-angle calculation with temporal smoothing (`SMOOTHED_ESTIMATE`) and outlier rejection (`JUMP_REJECTED`), plus sagittal-view gating (`UNAVAILABLE_CAMERA_VIEW` when non-sagittal). |
| **RULA / REBA Assessment** | Working prototype | Deterministic scoring engines implementing RULA (1–7, upper limb) and REBA (1–15, whole body) with mandatory manual confirmation factors and local SQLite persistence. |
| **Worker Feedback Check-In** | Working prototype | Anonymous operator discomfort check-in (<20 seconds) capturing body zone, intensity (1–10), task, timing, and optional workstation note — collecting no personal name, employee ID, or badge number. |
| **3D Workstation Digital Twin** | Working prototype + demo scenario | Interactive WebGL (Three.js) workstation model featuring assembly table, wiring harness jig, operator mannequin, and color-coded Connector Groups (A–D) linked to parametric geometry. |
| **What-If Simulator** | Simulation layer | Parametric workstation geometry controls (connector height, reach distance, orientation) with missing-measurement warnings; simulated projections are clearly separated from measured field improvements. |
| **Executive Overview, Body & Task Analysis** | UI ready (`DEMO DATA`) | Interactive charts, anterior/posterior body discomfort heatmap, and task exposure matrix preloaded with synthetic demonstration data (`DEMO DATA` badge) to illustrate workstation-level analytics. |
| **AI Recommendations, Interventions & Economic Impact** | Rule-based + illustrative data | Explainable correlation chain (`Body Zone -> Task -> Workstation Zone -> Associated Exposure -> Recommended Investigation`), before/after intervention tracking, and editable ROI assumptions. |

> **Important Note on Data:** All preloaded workstation trends (e.g., 7/10 left shoulder discomfort, 72/100 overall exposure score, 276 s task breakdown) and financial ROI scenarios are **synthetic demonstration data** and **illustrative financial assumptions** — not real LEONI worker measurements or company financials.

## System Architecture

```text
1. Data Collection      -> Anonymous worker feedback, task metadata, workstation geometry, local video
2. Data Processing      -> Body-zone aggregation, OpenCV + MediaPipe Pose landmarks, NumPy joint angles
3. Ergonomic Assessment -> Deterministic RULA (1–7) and REBA (1–15) engines + manual factor confirmation
4. Risk Analysis        -> Early-warning trend detection, task correlation, workstation hotspot mapping
5. Digital Twin (3D)    -> Interactive Three.js workstation + parametric What-If simulation
6. Recommendations      -> Explainable rule-based investigation pistes and estimated intervention cost
7. Field Validation     -> Physical intervention, before/after RULA/REBA re-assessment, measured ROI
```

## Tech Stack & Rationale

| Layer | Technologies | Why Chosen |
| :--- | :--- | :--- |
| **Frontend & 3D** | React, TypeScript, Vite, Three.js (WebGL) | Browser-native interactive 3D digital twin and responsive dashboards with zero heavy CAD licensing required. |
| **Backend API** | Python, FastAPI | Fast, lightweight local REST API suitable for on-premise workshop deployment. |
| **Computer Vision** | OpenCV, MediaPipe Pose Landmarker (BlazePose), NumPy | Runs locally on standard CPU hardware without expensive GPUs, preserving privacy while providing real-time landmark visibility and angle reliability proxies. |
| **Ergonomic Engines** | Deterministic RULA & REBA modules | Fully auditable, reproducible standard ergonomic tables with no black-box clinical claims. |
| **Database** | SQLite (prototype) | Zero-configuration local storage for single-workstation pilots; ready to migrate to PostgreSQL for multi-line deployments. |

## Getting Started (Local Development)

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.10+ and **pip**
- Standard USB or built-in webcam (optional, for live posture screening; uploaded videos are also supported)

### 1. Clone the Repository

```bash
git clone <YOUR_REPO_URL>
cd <YOUR_REPO_FOLDER>
```

### 2. Start the Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Start the Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

> Adjust directory names (`backend/`, `frontend/`) or entrypoints (`main:app`) if your local repository uses a different folder layout.

## Field Validation Protocol

Simulated What-If reductions are decision-support estimates, never proof of real-world improvement. Industrial deployment follows a strict three-stage protocol:

1. **Baseline:** Observe workstation tasks, record geometry (heights, reach distances), perform ergonomist-confirmed RULA/REBA assessments, and collect voluntary anonymous worker feedback.
2. **Intervention:** Apply targeted physical or organizational adjustments (e.g., lowering and bringing Connector Group A closer, tilting fixtures, task rotation, or worker-selected micro-breaks).
3. **Follow-Up:** Repeat RULA/REBA scoring, discomfort frequency/intensity surveys, and reach measurements to quantify actual before/after gains against real implementation costs.

## Roadmap

- **Phase 1 (Current — Prototype):** React/Three.js frontend, FastAPI backend, local MediaPipe/OpenCV posture screening, deterministic RULA/REBA engines, anonymous check-in, and synthetic demo dataset.
- **Phase 2 (Pilot Workstation):** Single-workstation industrial deployment, baseline ergonomic validation with certified ergonomists, and hotspot confirmation.
- **Phase 3 (Intervention Validation):** Physical workstation modifications, before/after field measurements, and structured intervention knowledge-base updates.
- **Phase 4 (Industrial Scale):** Multi-line analytics, extended intervention library, and expansion across Tunisian and regional manufacturing sectors (automotive wiring, textiles, leather/footwear, electronics assembly).

## Team

**Team Name:** 'Phantom`

- `[imen bouzid]`
- `[selim zribi]`
- `[zayneb hamden]` 
- `[emna khlifa]` 
- `[mouhamed yessine laabidi]` 

## License

`[Add your license here — e.g., MIT License]`
