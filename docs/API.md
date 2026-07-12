# API Reference

## Overview

Base URL: `http://localhost:8000/api` (local) / `https://deepfake-detector-api.onrender.com/api` (production)

Authentication: none. Public endpoints are protected by IP-based rate limiting on analysis routes.

## Endpoints

### 1. Analyze a Single Image

Starts a background job to analyze one image for AI-generation signals.

```http
POST /analyze
```

Request:

- `Content-Type`: `multipart/form-data`
- `file`: JPEG, PNG, or WebP image, max 10 MB

Response: `202 Accepted`

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Job accepted and is processing in the background."
}
```

Errors:

- `413 Payload Too Large`: image exceeds 10 MB
- `415 Unsupported Media Type`: unsupported MIME type
- `429 Too Many Requests`: rate limit exceeded

### 2. Analyze a Batch of Images

Starts a background job to sequentially analyze up to 10 images.

```http
POST /batch
```

Request:

- `Content-Type`: `multipart/form-data`
- `files`: array of JPEG, PNG, or WebP images, max 10 files and 10 MB each

Response: `202 Accepted`

```json
{
  "job_id": "8b51c1cf-41c6-41fb-99e2-cf77864e42cb",
  "message": "Job accepted and is processing in the background."
}
```

Errors:

- `422 Unprocessable Entity`: too many files or invalid upload shape
- `429 Too Many Requests`: rate limit exceeded

### 3. Check Job Status

Poll this endpoint until the job is `completed` or `failed`.

```http
GET /status/{job_id}
```

Processing response: `200 OK`

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "result": null,
  "error": null
}
```

Completed single-image response: `200 OK`

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "result": {
    "id": "analysis-uuid",
    "verdict": "FAKE",
    "confidence": 0.985,
    "heatmap_url": "/api/heatmap/analysis-uuid",
    "artifacts": {
      "texture_score": 0.85,
      "lighting_score": 0.42,
      "edge_score": 0.91,
      "frequency_score": 0.77
    },
    "analysis_time_ms": 1240,
    "created_at": "2026-07-12T12:00:00Z",
    "filename": "suspicious.jpg"
  },
  "error": null
}
```

Completed batch response: `200 OK`

```json
{
  "job_id": "8b51c1cf-41c6-41fb-99e2-cf77864e42cb",
  "status": "completed",
  "result": {
    "total_analysis_time_ms": 3450,
    "results": [
      {
        "filename": "image1.jpg",
        "result": { "id": "analysis-uuid" },
        "error": null
      },
      {
        "filename": "corrupt.jpg",
        "result": null,
        "error": "Could not read image 'corrupt.jpg'"
      }
    ]
  },
  "error": null
}
```

Errors:

- `404 Not Found`: job does not exist or has expired

### 4. Paginated History

Retrieves successful analysis records.

```http
GET /history?page=1&page_size=20
```

Parameters:

- `page`: page number, 1-based, default `1`
- `page_size`: items per page, max `100`, default `20`

Response: `200 OK`

```json
{
  "items": [
    {
      "id": "analysis-uuid",
      "verdict": "REAL",
      "confidence": 0.99,
      "heatmap_url": "/api/heatmap/analysis-uuid",
      "artifacts": {
        "texture_score": 0.12,
        "lighting_score": 0.18,
        "edge_score": 0.22,
        "frequency_score": 0.15
      },
      "analysis_time_ms": 870,
      "created_at": "2026-07-12T12:00:00Z",
      "filename": "camera.jpg"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

### 5. Analysis Detail

Retrieves one saved analysis record by ID.

```http
GET /history/{analysis_id}
```

Response: `200 OK`

```json
{
  "id": "analysis-uuid",
  "verdict": "FAKE",
  "confidence": 0.91,
  "heatmap_url": "/api/heatmap/analysis-uuid",
  "artifacts": {
    "texture_score": 0.82,
    "lighting_score": 0.44,
    "edge_score": 0.71,
    "frequency_score": 0.63
  },
  "analysis_time_ms": 48,
  "created_at": "2026-07-12T12:00:00Z",
  "filename": "sample.jpg"
}
```

Errors:

- `404 Not Found`: analysis ID does not exist

### 6. Fetch Heatmap

Retrieves the generated heatmap image for an analysis.

```http
GET /heatmap/{analysis_id}
```

Response: `200 OK`

- `Content-Type`: `image/png`
- Body: binary PNG data

Errors:

- `404 Not Found`: heatmap does not exist

### 7. Health Check

Used for liveness checks and frontend mode display.

```http
GET /health
```

Response: `200 OK`

```json
{
  "status": "ok",
  "model_loaded": false,
  "version": "0.1.0",
  "demo_mode": true,
  "model_mode": "demo"
}
```

`model_mode` is one of:

- `demo`: deterministic demo inference, default for clone-and-run review
- `mock`: mock inference without demo labeling
- `real`: configured model weights are loaded for real inference