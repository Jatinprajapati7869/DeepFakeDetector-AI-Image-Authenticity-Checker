# System Architecture

## Overview

DeepFakeDetector is a dual-tier web application designed for high-performance AI inference while maintaining a highly responsive UI.

- **Frontend**: React 18, Vite, TypeScript, TailwindCSS.
- **Backend**: FastAPI, Python 3.12, PyTorch, SQLite (WAL mode).
- **Model**: EfficientNet-B4 (`timm`) + Custom classifier head.

---

## 1. Request Flow (Analysis)

Due to the heavy CPU/GPU requirements of PyTorch inference, image processing cannot be run on the main FastAPI asynchronous event loop, as it would block the server and fail health checks.

We solve this using a **Background Task Polling Pattern**:
1. User uploads an image via `POST /api/analyze`.
2. The FastAPI route instantly validates the file type and size.
3. A `job_id` is generated and registered in an in-memory dictionary.
4. The heavy analysis is delegated to `asyncio.to_thread` via a `BackgroundTask`.
5. The API returns `202 Accepted` immediately with the `job_id`.
6. The frontend polls `GET /api/status/{job_id}` every 500ms.
7. Once inference is complete, the background task writes the `AnalysisResult` back to the dictionary and persists it to the SQLite database.
8. The frontend's next poll receives the result and transitions the UI.

---

## 2. Artificial Intelligence Pipeline

When a background job executes, it runs through the following pipeline (`analysis_service.py`):

1. **Preprocessing**: The image is opened with `Pillow`, converted to RGB, and resized if it exceeds `1024px` to bound memory usage.
2. **Inference**: Passed to `detector.predict()` (EfficientNet-B4) which outputs a binary verdict (`REAL` | `FAKE`) and a confidence scalar.
3. **Explainability**: The tensor gradients from the final convolutional layer are extracted using Grad-CAM to generate a heatmap indicating *why* the model made its decision.
4. **Heuristics (Artifact Breakdown)**: Classical CV algorithms (`OpenCV`) run over the image to detect:
   - *Texture Variance* (Blur/Oversmoothing)
   - *Lighting Inconsistencies*
   - *Edge Halos* (Canny Edge detection)
   - *High-Frequency Noise* (Checkerboard GAN artifacts via Fourier Transform)

---

## 3. Database Architecture

The backend utilizes **SQLite** for lightweight persistence without requiring an external database cluster.

### Concurrency Optimizations
SQLite is historically prone to `database is locked` errors during concurrent writes. To resolve this, we configured the SQLAlchemy engine with specific pragmas (`database.py`):
- `PRAGMA journal_mode=WAL;`: Enables Write-Ahead Logging for concurrent readers and writers.
- `PRAGMA synchronous=NORMAL;`: Trades a microscopic risk of corruption during power loss for significantly faster disk I/O.

---

## 4. Security & Resilience

- **Rate Limiting**: Custom in-memory sliding window rate limiter protects endpoints against automated DDoS/Spam uploads.
- **Job Pruning**: The background job dictionary is pruned deterministically every 5 minutes to prevent memory leaks from abandoned polling jobs.
- **HTTP Security Headers**: Middleware injects `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, and `Strict-Transport-Security` headers on every response.
