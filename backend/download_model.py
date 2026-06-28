"""
Model weight bootstrapper — runs at container startup before uvicorn.

Downloads best_model.pth from HuggingFace if it is not already present.
On Render/Railway the weights directory is ephemeral, so this script
ensures the model is always available when the server starts.

Usage (in Dockerfile CMD or Render start command):
    python download_model.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT
"""

import os
import sys
from pathlib import Path

HF_REPO = os.getenv("HF_MODEL_REPO", "Yashikaysn29/deepshield")
HF_FILE = os.getenv("HF_MODEL_FILE", "best_model.pth")
MODEL_PATH = Path(os.getenv("MODEL_PATH", "./weights/best_model.pth"))


def main() -> None:
    if MODEL_PATH.exists():
        size_mb = MODEL_PATH.stat().st_size / 1_048_576
        print(
            f"[startup] Model already present at {MODEL_PATH} ({size_mb:.1f} MB) — skipping download."
        )
    else:
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        print(f"[startup] Model not found. Downloading {HF_REPO}/{HF_FILE} ...")

        try:
            from huggingface_hub import hf_hub_download

            downloaded = hf_hub_download(
                repo_id=HF_REPO,
                filename=HF_FILE,
                local_dir=str(MODEL_PATH.parent),
            )
            print(f"[startup] Downloaded to {downloaded}")
        except Exception as exc:
            print(
                f"[startup] ERROR: Could not download model weights: {exc}", file=sys.stderr
            )
            print("[startup] Starting in MOCK mode as fallback.", file=sys.stderr)
            os.environ["USE_MOCK_MODEL"] = "true"

    # Start the web server from within the Python script so env vars persist
    import subprocess
    port = os.getenv("PORT", "8000")
    print(f"[startup] Booting web server on port {port}...")
    subprocess.run(["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", port])


if __name__ == "__main__":
    main()
