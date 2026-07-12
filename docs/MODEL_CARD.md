# Model Card - DeepFake Detection (EfficientNet-B4)

## Model Details

- **Architecture**: EfficientNet-B4 (pretrained on ImageNet, fine-tuned for binary classification)
- **Framework**: PyTorch via `timm`
- **Parameters**: ~19M
- **License**: MIT (this project); timm models under Apache 2.0

## Intended Use

- **Primary**: Detecting AI-generated images in uploaded photos
- **Secondary**: Educational tool demonstrating Grad-CAM explainability
- **Not intended for**: Legal evidence, surveillance, or automated content moderation without human review

## Ethical Considerations

- False positives can wrongly flag authentic images as AI-generated
- False negatives may provide false confidence that manipulated images are real
- The model should be used as one signal among many, not as a definitive classifier
- Users should understand that AI generation techniques evolve faster than detection models

## Performance

See [EVALUATION.md](EVALUATION.md) for detailed metrics.
## Demo Mode Disclosure

The default local configuration uses `DEMO_MODE=true`, which returns deterministic simulated predictions. Demo mode exists so reviewers can run the full product without downloading large weights. It must not be cited as model performance.

For real inference, set `DEMO_MODE=false` and `USE_MOCK_MODEL=false`, then provide `MODEL_PATH=./weights/best_model.pth`.
