"""
EfficientNet-B4 deepfake detector.

Supports two modes:
  - USE_MOCK_MODEL=true  (default): returns random predictions. Fast startup,
    no weights needed. Good for frontend development.
  - USE_MOCK_MODEL=false: loads the pre-trained DeepShield weights from
    MODEL_PATH and runs real EfficientNet-B4 inference.

Weight source: Yashikaysn29/deepshield on Hugging Face
Architecture : timm EfficientNet-B4 backbone + custom sigmoid head
Label convention: sigmoid output — 0.0 = Fake, 1.0 = Real
"""

import random
from pathlib import Path
from typing import TYPE_CHECKING

from app.core.config import settings

if TYPE_CHECKING:
    from PIL import Image as PILImage


# Input transform constants — 224×224 is the size used during DeepShield training
IMAGE_SIZE = 224


def _build_model():
    """Construct and return the DeepShield model class (lazy import)."""
    import timm
    import torch.nn as nn

    class _DeepShieldModel(nn.Module):
        def __init__(self):
            super().__init__()
            self.backbone = timm.create_model(
                "efficientnet_b4", pretrained=False, num_classes=0
            )
            self.classifier = nn.Sequential(
                nn.Linear(self.backbone.num_features, 256),
                nn.ReLU(),
                nn.Dropout(0.4),
                nn.Linear(256, 1),
                nn.Sigmoid(),
            )

        def forward(self, x):
            return self.classifier(self.backbone(x))

    return _DeepShieldModel()


class DeepfakeDetector:
    """
    Wraps EfficientNet-B4 (DeepShield) inference.
    In mock mode no ML libraries are loaded, keeping startup under 5 seconds.
    """

    def __init__(self) -> None:
        self._mock = settings.use_mock_model
        self._model = None
        self._device = None

        if not self._mock:
            self._load_model()

    def _load_model(self) -> None:
        import torch

        # Restrict PyTorch to a single thread to prevent CPU thrashing
        # and memory spikes on small instances (like Render Free Tier).
        torch.set_num_threads(1)

        weights_path = Path(settings.model_path)
        if not weights_path.exists():
            raise FileNotFoundError(
                f"Model weights not found at {weights_path}. "
                'Run: python -c "from huggingface_hub import hf_hub_download; '
                "hf_hub_download('Yashikaysn29/deepshield', 'best_model.pth', local_dir='./weights')\""
            )

        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model = _build_model()
        state_dict = torch.load(
            weights_path, map_location=self._device, weights_only=True
        )
        model.load_state_dict(state_dict)
        model.eval()
        self._model = model.to(self._device)

    def predict(self, image: "PILImage") -> tuple[str, float]:
        """
        Run inference on a PIL image.

        Returns:
            verdict:    'REAL' or 'FAKE'
            confidence: probability for the verdict (0.0 – 1.0)

        Label convention (DeepShield):
            sigmoid output ≥ 0.5 → REAL  (score is the real probability)
            sigmoid output < 0.5 → FAKE  (1 - score is the fake confidence)
        """
        if self._mock:
            return self._mock_predict()

        import torch
        from torchvision import transforms

        transform = transforms.Compose(
            [
                transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
            ]
        )

        tensor = transform(image).unsqueeze(0).to(self._device)

        with torch.inference_mode():
            real_prob: float = self._model(tensor).item()

        if real_prob >= 0.5:
            return "REAL", round(real_prob, 4)
        else:
            return "FAKE", round(1.0 - real_prob, 4)

    def get_model(self):
        """Expose the underlying nn.Module for Grad-CAM hook attachment."""
        return self._model

    @staticmethod
    def _mock_predict() -> tuple[str, float]:
        verdict = random.choice(["REAL", "FAKE"])
        confidence = round(random.uniform(0.70, 0.99), 4)
        return verdict, confidence


detector = DeepfakeDetector()
