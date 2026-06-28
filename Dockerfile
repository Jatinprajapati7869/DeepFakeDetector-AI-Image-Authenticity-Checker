# Root-level Dockerfile — used by Render and any deployment platform
# that expects a Dockerfile at the repo root.
#
# Builds the FastAPI backend from the backend/ subdirectory.

FROM python:3.11-slim

WORKDIR /app

# System dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (cached unless requirements.txt changes)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# Create runtime directories
RUN mkdir -p data/heatmaps weights

EXPOSE 8000

# Download model weights (if missing) then start the server.
# $PORT is injected by Render; falls back to 8000 locally.
CMD python download_model.py && \
    uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
