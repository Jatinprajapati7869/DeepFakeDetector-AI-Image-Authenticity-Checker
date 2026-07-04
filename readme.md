# DeepFakeDetector - AI Image Authenticity Checker

![CI/CD](https://github.com/Jatinprajapati7869/DeepFakeDetector-AI-Image-Authenticity-Checker/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

Upload any image and find out if it is real or AI-generated, with a confidence score and a Grad-CAM heatmap highlighting suspicious regions.

**Live Demo**: [https://deepfake-detector.vercel.app](https://deepfake-detector.vercel.app)

---

## ⚡ Quick Start (Local Development)

We use a unified, cross-platform toolchain for incredibly fast onboarding.

### Prerequisites
- Node.js 20+
- Python 3.12+ 

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Jatinprajapati7869/DeepFakeDetector-AI-Image-Authenticity-Checker.git
   cd DeepFakeDetector-AI-Image-Authenticity-Checker
   ```

2. **One-Command Setup**
   ```bash
   npm run setup
   ```
   *(This automatically installs Backend Python dependencies, Frontend NPM modules, and Git Pre-Commit Hooks).*

3. **Start the Application**
   ```bash
   npm run dev
   ```
   *(This spawns both the FastAPI backend and Vite frontend development servers).*

4. **Verify Quality**
   ```bash
   npm run check
   ```
   *(This runs Ruff, Prettier, Pytest, and Vitest across the entire project).*

---

## 📚 Documentation

Detailed documentation has been split into dedicated files:

- **[API Reference](docs/API.md)**: Detailed endpoints, JSON payloads, and response schemas.
- **[Architecture Overview](docs/ARCHITECTURE.md)**: System design, background polling pattern, and SQLite optimizations.
- **[Troubleshooting](docs/TROUBLESHOOTING.md)**: Solutions for common installation and runtime errors.
- **[Contributing Guide](CONTRIBUTING.md)**: Guidelines for Pull Requests, Git Hooks, and Conventional Commits.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy, SQLite (WAL mode) |
| **AI Model** | EfficientNet-B4 (`timm`), ~99% accuracy on DeepShield |
| **Explainability** | Grad-CAM (Gradient-weighted Class Activation Mapping) |
| **Toolchain** | Ruff, Prettier, Husky, Commitlint, GitHub Actions |

---

## ☁️ Deployment

### Backend (Render Free Tier)
The backend is designed to run seamlessly on Render's Web Service. Render automatically detects the `render.yaml` file in this repository.
*Note: Render free tier spins down after 15 minutes of inactivity. The first request after idle takes ~30-60 seconds to wake.*

### Frontend (Vercel)
The frontend is optimized for edge deployment on Vercel. 
Simply point Vercel to the `frontend/` root directory and set the environment variable:
`VITE_API_BASE_URL = https://your-render-api-url.onrender.com`

---

## 📜 License

MIT License. See `LICENSE` for more information.
