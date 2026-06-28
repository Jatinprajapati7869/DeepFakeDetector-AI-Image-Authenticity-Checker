# DeepFakeDetector — Backend

FastAPI service that runs EfficientNet-B4 inference, generates Grad-CAM heatmaps,
and persists analysis history to SQLite.

## Quick Start

```bash
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Interactive API docs: http://localhost:8000/docs

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `USE_MOCK_MODEL` | `true` | Return mock predictions (no weights needed) |
| `MODEL_PATH` | `./weights/efficientnet_b4_ft.pth` | Path to fine-tuned weights |
| `MAX_UPLOAD_SIZE_MB` | `10` | Maximum image upload size |
| `RATE_LIMIT_PER_MINUTE` | `10` | Requests per IP per minute on /analyze |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/history.db` | SQLAlchemy DB URL |
| `HEATMAP_STORAGE_PATH` | `./data/heatmaps` | Directory to save heatmap PNGs |

## API Endpoints

### `POST /api/analyze`
Analyze a single image. Returns verdict, confidence, heatmap URL, and artifact scores.

**Request**: `multipart/form-data` with a `file` field (JPEG/PNG/WebP, max 10 MB).

**Response**:
```json
{
  "id": "uuid",
  "verdict": "FAKE",
  "confidence": 0.94,
  "heatmap_url": "/api/heatmap/uuid",
  "artifacts": {
    "texture_score": 0.82,
    "lighting_score": 0.61,
    "edge_score": 0.74,
    "frequency_score": 0.55
  },
  "analysis_time_ms": 312,
  "created_at": "2026-06-28T10:00:00Z",
  "filename": "photo.jpg"
}
```

### `POST /api/batch`
Analyze up to 10 images in one request. Rate limited to 5 req/min.

**Request**: `multipart/form-data` with multiple `files` fields.

### `GET /api/history`
Paginated analysis history, ordered newest-first.

Query params: `page` (default 1), `page_size` (default 20, max 100).

### `GET /api/heatmap/{id}`
Serve the Grad-CAM heatmap PNG for a given analysis ID.

### `GET /api/health`
Returns `{ "status": "ok", "model_loaded": bool, "version": "0.1.0" }`.

## Running Tests

```bash
pytest
```

Tests use mock model mode by default — no weights or GPU required.

## Swapping in Real Weights

1. Train the model: see `../model_training/README.md`
2. Copy the output `.pth` to `weights/efficientnet_b4_ft.pth`
3. Set `USE_MOCK_MODEL=false` in `.env`
4. Restart uvicorn

## Project Structure

```
app/
├── api/routes/     analyze.py, batch.py, history.py
├── core/           config.py (Settings), security.py (rate limiter)
├── db/             database.py (SQLAlchemy engine), models.py (ORM)
├── models/         detector.py (EfficientNet), gradcam.py, schemas.py
├── services/       analysis_service.py, history_service.py
└── main.py         FastAPI app factory
```
