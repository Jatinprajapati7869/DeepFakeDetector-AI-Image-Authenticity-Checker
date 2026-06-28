# DeepFakeDetector — Model Training

Fine-tunes EfficientNet-B4 on the 140k Real and Fake Faces dataset to classify
images as real or AI-generated, then exports weights for the FastAPI backend.

## Dataset

**140k Real and Fake Faces** by xhlulu on Kaggle  
https://www.kaggle.com/datasets/xhlulu/140k-real-and-fake-faces

- Real images: FFHQ (Flickr-Faces-HQ)
- Fake images: StyleGAN2 generated

### Download

```bash
# Install Kaggle CLI
pip install kaggle

# Download (requires kaggle.json API key in ~/.kaggle/)
kaggle datasets download -d xhlulu/140k-real-and-fake-faces -p ./data
cd data && unzip 140k-real-and-fake-faces.zip
```

Expected layout after extraction:

```
data/real_vs_fake/real-vs-fake/
├── train/
│   ├── real/     # ~70k images
│   └── fake/     # ~70k images
├── valid/
│   ├── real/
│   └── fake/
└── test/
    ├── real/
    └── fake/
```

## Training

```bash
python train.py --data ./data/real_vs_fake/real-vs-fake --epochs 20 --batch-size 32
```

**What the script does:**
1. Loads ImageNet-pretrained EfficientNet-B4
2. Freezes the bottom 80% of feature layers
3. Fine-tunes the top 20% + a new `Dropout → Linear(2)` classifier head
4. Trains with mixed precision (AMP) for ~2× speed on GPU
5. Uses cosine annealing LR schedule and early stopping on val accuracy
6. Saves the best checkpoint to `../backend/weights/efficientnet_b4_ft.pth`

**Expected results** (on GPU):
- Training time: ~2–3 hours on a single A100 / ~6 hours on a T4
- Val accuracy: ~96–97%

## Evaluation

```bash
python evaluate.py \
  --data ./data/real_vs_fake/real-vs-fake \
  --weights ../backend/weights/efficientnet_b4_ft.pth
```

Outputs overall accuracy, per-class precision/recall/F1, and a confusion matrix.

## Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| Base model | EfficientNet-B4 | Best accuracy/speed tradeoff; trivial Grad-CAM hooks |
| Fine-tuning | Top 20% layers + head | Preserves low-level features, adapts high-level ones |
| Loss | CrossEntropyLoss (label_smoothing=0.1) | Prevents overconfidence on clean training examples |
| Optimizer | AdamW (lr=1e-4, wd=1e-2) | Weight decay prevents overfitting on balanced dataset |
| Augmentation | Flip, ColorJitter, GaussianBlur | Improves generalization to real-world image conditions |

## GPU Requirements

- Minimum: 8 GB VRAM (batch size 16)
- Recommended: 16 GB VRAM (batch size 32)
- CPU training is possible but will take ~10× longer

## After Training

1. Copy weights to the backend:

   ```bash
   # Already done automatically by train.py, but if needed:
   cp ../backend/weights/efficientnet_b4_ft.pth ../backend/weights/
   ```

2. Activate the model in the backend:

   ```bash
   # In backend/.env
   USE_MOCK_MODEL=false
   ```

3. Restart the backend and verify:

   ```bash
   curl http://localhost:8000/api/health
   # "model_loaded": true
   ```
