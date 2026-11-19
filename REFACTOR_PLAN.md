# Refactoring plan

1. Preserve the original Gemini TSX as a byte-for-byte backup; inventory its dependencies, data, pages, interactions and Three.js scene.
2. Add a Vite + React + TypeScript shell and retain the original dashboard as a temporary visual reference while extracting pages and shared components incrementally.
3. Separate domain types, frontend API services and state from UI components; keep demo-mode behavior explicit.
4. Build FastAPI schemas and independently validated ergonomic engines, starting with incomplete-input handling and only exposing scores verified against official scoring tables.
5. Add anonymous aggregate feedback, trend/recommendation logic, transparent simulation comparisons, intervention persistence and assumption-labeled ROI.
6. Connect dashboard workflows to backend services; preserve the existing 3D scene and verify the full demo flow and privacy boundaries.
