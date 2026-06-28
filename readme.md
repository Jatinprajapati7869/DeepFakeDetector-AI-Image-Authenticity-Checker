# DeepFakeDetector - AI Image Authenticity Checker

Upload any image and find out if it is real or AI-generated,
with a confidence score and a Grad-CAM heatmap highlighting suspicious regions.

Live demo: https://deepfake-detector.vercel.app (update after deploying)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Python 3.11 + FastAPI + SQLAlchemy |
| AI Model | EfficientNet-B4 (DeepShield, ~99% accuracy) |
| Explainability | Grad-CAM heatmaps |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |

---

## Run Locally

### Option 1: One-click (Windows)

Double-click start.bat in the project root.

### Option 2: Manual

Backend (Terminal 1):

    cd backend
    pip install -r requirements.txt
    python download_model.py
    uvicorn app.main:app --reload

Frontend (Terminal 2):

    cd frontend
    npm install
    npm run dev

Open http://localhost:5173

---

## Deploy to the Web (Free)

### Step 1 - Push to GitHub

    git init
    git add .
    git commit -m "feat: initial DeepFakeDetector"
    git remote add origin https://github.com/YOUR_USERNAME/deepfake-detector.git
    git push -u origin main

### Step 2 - Deploy Backend to Render

1. Go to https://render.com and sign up with GitHub
2. Click New + > Web Service
3. Connect your GitHub repo
4. Render auto-detects render.yaml and creates the service
5. First deploy takes ~3 minutes (includes 73 MB model download)
6. Copy your Render URL, e.g. https://deepfake-detector-api.onrender.com

### Step 3 - Deploy Frontend to Vercel

1. Go to https://vercel.com and sign up with GitHub
2. Click Add New > Project
3. Import your GitHub repo
4. Set Root Directory to: frontend
5. Add Environment Variable:
   VITE_API_BASE_URL = https://deepfake-detector-api.onrender.com
6. Click Deploy
7. Your site is live at https://YOUR_PROJECT.vercel.app

### Step 4 - Fix CORS

In Render dashboard, set:

    CORS_ORIGINS=https://YOUR_PROJECT.vercel.app,http://localhost:5173

Then trigger a redeploy.

---

## Note: Render Free Tier Cold Starts

Render free tier spins down after 15 minutes of inactivity.
The first request after idle takes ~30-60 seconds to wake.
For a demo, open the backend health URL first:
https://deepfake-detector-api.onrender.com/api/health

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/analyze | Analyze a single image |
| POST | /api/batch | Analyze up to 10 images |
| GET | /api/history | Paginated history |
| GET | /api/heatmap/{id} | Serve heatmap PNG |
| GET | /api/health | Liveness probe |

Interactive docs: http://localhost:8000/docs

---

## Tests

    cd backend && pytest       # 10 backend tests
    cd frontend && npm test    # 26 frontend tests

---

## Model

Source: Yashikaysn29/deepshield on HuggingFace
Architecture: EfficientNet-B4 (timm) + custom classifier head
Dataset: 140k real and AI-generated face images
Accuracy: ~99% validation accuracy
Size: 72.8 MB
