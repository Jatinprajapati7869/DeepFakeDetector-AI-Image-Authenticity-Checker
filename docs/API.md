# API Reference

## Overview

Base URL: `http://localhost:8000/api` (Local) / `https://deepfake-detector-api.onrender.com/api` (Production)

Authentication: None (Publicly accessible, protected by IP-based rate limiting)

---

## Endpoints

### 1. Analyze a Single Image

Initiates a background job to analyze an image for AI manipulation.

```http
POST /analyze
```

**Request:**
- `Content-Type`: `multipart/form-data`
- Body Parameter: `file` (File: JPEG, PNG, or WebP. Max 10MB)

**Response:** `202 Accepted`
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Errors:**
- `413 Payload Too Large`: Image exceeds 10MB limit.
- `415 Unsupported Media Type`: Image is not JPEG/PNG/WebP.
- `429 Too Many Requests`: Rate limit exceeded.

---

### 2. Analyze a Batch of Images

Initiates a background job to sequentially analyze up to 10 images.

```http
POST /batch
```

**Request:**
- `Content-Type`: `multipart/form-data`
- Body Parameter: `files` (Array of Files: Up to 10 images, max 10MB each)

**Response:** `202 Accepted`
```json
{
  "job_id": "8b51c1cf-41c6-41fb-99e2-cf77864e42cb"
}
```

**Errors:**
- `422 Unprocessable Entity`: Too many files in the batch (>10).

---

### 3. Check Job Status

Poll this endpoint to retrieve the status and eventual results of an analysis job.

```http
GET /status/{job_id}
```

**Response (Processing):** `200 OK`
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "result": null,
  "error": null
}
```

**Response (Completed Single):** `200 OK`
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
    "created_at": "2024-01-01T12:00:00Z",
    "filename": "suspicious.jpg"
  },
  "error": null
}
```

**Response (Completed Batch):** `200 OK`
```json
{
  "job_id": "8b51c1cf-41c6-41fb-99e2-cf77864e42cb",
  "status": "completed",
  "result": {
    "total_analysis_time_ms": 3450,
    "results": [
      {
        "filename": "image1.jpg",
        "result": { ... },
        "error": null
      },
      {
        "filename": "corrupt.jpg",
        "result": null,
        "error": "Cannot open image"
      }
    ]
  },
  "error": null
}
```

**Errors:**
- `404 Not Found`: Job does not exist or has expired.

---

### 4. Paginated History

Retrieves past successful analysis records.

```http
GET /history?page=1&page_size=20
```

**Parameters:**
- `page` (integer): Page number (1-based). Default: 1.
- `page_size` (integer): Items per page (max 100). Default: 20.

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "analysis-uuid",
      "verdict": "REAL",
      "confidence": 0.99,
      "heatmap_url": "/api/heatmap/analysis-uuid",
      ...
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20,
  "pages": 1
}
```

---

### 5. Fetch Heatmap

Retrieves the Grad-CAM heatmap generated during analysis.

```http
GET /heatmap/{analysis_id}
```

**Response:** `200 OK`
- `Content-Type`: `image/png`
- (Binary PNG Data)

**Errors:**
- `404 Not Found`: Heatmap does not exist.

---

### 6. Health Check

Used for infrastructure liveness probing (e.g., waking up Render free-tier).

```http
GET /health
```

**Response:** `200 OK`
```json
{
  "status": "ok",
  "model_loaded": true,
  "version": "1.0.0"
}
```
