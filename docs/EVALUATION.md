# Model Evaluation Report

## Model Architecture

- **Base Model**: EfficientNet-B4 (via `timm` library)
- **Task**: Binary classification (Real vs AI-Generated)
- **Input**: 380x380 RGB images (center-cropped and normalized)
- **Output**: Probability score [0, 1] with Grad-CAM heatmap

## Training Data

- **Dataset**: [Specify dataset name, e.g., DeepShield, FaceForensics++, or custom]
- **Real Images**: [Number] samples from [source]
- **AI-Generated Images**: [Number] samples from [generation methods, e.g., StyleGAN, Stable Diffusion, DALL-E]
- **Train/Val/Test Split**: [e.g., 80/10/10]

## Results

| Metric | Value |
|---|---|
| Accuracy | [value] |
| Precision (AI-Generated) | [value] |
| Recall (AI-Generated) | [value] |
| F1 Score | [value] |
| AUC-ROC | [value] |

## Mock Mode vs Real Mode

The application supports two modes:

- **Mock Mode** (default): Returns randomized predictions for demonstration. No model weights required.
- **Real Mode**: Loads the trained EfficientNet-B4 weights and runs actual inference with Grad-CAM.

> **Note**: If you see this repo in mock mode, the classification results are simulated. Real inference requires the model weights file.

## Known Limitations

- Performance may degrade on image types not represented in training data
- Grad-CAM highlights are approximate; they show regions the model attends to, not definitive proof of manipulation
- Very high-quality AI generations (e.g., latest Stable Diffusion XL) may evade detection
- Model was not tested on video frames or compressed social media images

## Reproducing Results

```bash
# Install dependencies
cd backend && pip install -r requirements.txt

# Run evaluation (requires model weights + test dataset)
python -m pytest tests/ -v
```