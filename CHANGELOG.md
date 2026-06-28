# Changelog

All notable changes to DeepFakeDetector are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- Replaced `slowapi` (Python 3.14 incompatible) with a zero-dependency sliding-window `RateLimitMiddleware`
- Switched model source to `Yashikaysn29/deepshield` (HuggingFace) — EfficientNet-B4 trained on 140k real/fake faces, ~99% val accuracy
- Made `torch`/`torchvision`/`timm` imports lazy — startup time in mock mode dropped from 40s → 4s
- Fixed Grad-CAM module reference bug (`from X import Y` captured stale `None`; fixed to `import X as module`)
- Added `conftest.py` with per-test in-memory SQLite and `@pytest_asyncio.fixture` for pytest-asyncio 1.x compatibility
- Added barrel exports for `components/`, `hooks/`, `pages/`
- Added `start.bat` for one-click Windows server launch

### Added
- `backend/weights/best_model.pth` — pre-trained EfficientNet-B4 deepfake detector weights
- `timm` and `huggingface_hub` dependencies
- 4 frontend test files (26 Vitest tests total)
- `vite-env.d.ts` for Vite `ImportMeta` env types

---

## [0.1.0 — Scaffold]

### Added
- Full project scaffold: React/TypeScript frontend (Vite), FastAPI backend, model training pipeline
- `POST /api/analyze` — single image analysis endpoint with rate limiting
- `POST /api/batch` — batch analysis for up to 10 images
- `GET /api/history` — paginated analysis history with SQLite persistence
- `GET /api/heatmap/{id}` — serve Grad-CAM heatmap PNG
- `GET /api/health` — liveness probe endpoint
- EfficientNet-B4 inference wrapper with mock mode for development
- Grad-CAM engine with mock heatmap generation (Gaussian blob simulation)
- Classical CV artifact sub-scores: texture (Laplacian), lighting (Sobel), edge (Canny), frequency (FFT)
- `ImageUploader` — drag-and-drop with native HTML events, keyboard accessible
- `HeatmapCanvas` — Canvas API composite overlay with toggle button
- `ConfidenceGauge` — animated SVG arc meter
- `AnalysisBreakdown` — four animated artifact score bars with tooltips
- `HistoryLog` — paginated history table with item drill-down
- `BatchUploader` — multi-file analysis queue with results table
- `EducationalMode` — collapsible guide to common deepfake artifacts
- `useImageAnalysis`, `useHeatmapOverlay`, `useHistory` custom hooks
- Docker Compose setup for local full-stack development
- Dockerfiles for both frontend (nginx) and backend (uvicorn)
- pytest integration tests for analyze, gradcam, and history endpoints
- Vitest + Testing Library setup for frontend
- EfficientNet-B4 fine-tuning script with AMP and early stopping
- Evaluation script with accuracy, per-class F1, and confusion matrix
- Full `.gitignore`, `.env.example`, and documentation
