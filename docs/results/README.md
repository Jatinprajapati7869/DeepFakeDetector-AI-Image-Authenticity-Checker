# Evaluation Results

No real-model metric artifact is committed yet.

To publish metrics, run the real evaluation command with fixed weights and a fixed test dataset:

```powershell
python model_training/evaluate.py `
  --data ./model_training/data/real_vs_fake/real-vs-fake `
  --weights ./backend/weights/efficientnet_b4_ft.pth `
  --output ./docs/results/metrics.json
```

Only commit `metrics.json` after recording the dataset version, weight hash, and evaluation command used to produce it.