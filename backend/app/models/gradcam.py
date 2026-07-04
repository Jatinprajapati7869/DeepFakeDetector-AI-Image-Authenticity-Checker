"""
Grad-CAM for the DeepShield EfficientNet-B4 model.

Target layer: model.backbone.blocks[-1] — the last EfficientNet block,
which captures high-level spatial features most relevant to the decision.

In mock mode, generates a synthetic Gaussian-blob heatmap so the frontend
pipeline can be exercised without real weights.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np
from PIL import Image

from app.core.config import settings
from app.models.detector import IMAGE_SIZE

if TYPE_CHECKING:
    import torch.nn as nn


class GradCAMEngine:
    def __init__(self, model: nn.Module | None) -> None:
        self._model = model
        self._feature_maps = None
        self._gradients = None

        if model is not None:
            self._register_hooks()

    def _register_hooks(self) -> None:
        # Hook the last block of the timm EfficientNet-B4 backbone
        target_layer = self._model.backbone.blocks[-1]  # type: ignore[union-attr]

        def _save_features(_, __, output):
            self._feature_maps = output.detach()

        def _save_gradients(_, __, grad_output):
            self._gradients = grad_output[0].detach()

        target_layer.register_forward_hook(_save_features)
        target_layer.register_full_backward_hook(_save_gradients)

    def generate(
        self,
        image: Image.Image,
        target_class: int,
        analysis_id: str,
    ) -> str:
        """
        Compute and save a Grad-CAM heatmap.

        Args:
            image:        Original PIL image.
            target_class: 0 = Fake region, 1 = Real region. We always pass the
                          predicted class so the map highlights the decision basis.
            analysis_id:  UUID used to name the output PNG.

        Returns:
            URL path for the saved heatmap (e.g. /api/heatmap/<id>).
        """
        if self._model is None or settings.use_mock_model:
            return self._generate_mock_heatmap(image, analysis_id)

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

        tensor = transform(image).unsqueeze(0).requires_grad_(True)

        self._model.zero_grad()
        output = self._model(tensor)  # shape: [1, 1] — single sigmoid output

        # Differentiate w.r.t. the output neuron regardless of target_class,
        # since it's a single-output sigmoid model
        output.backward()

        assert self._feature_maps is not None and self._gradients is not None

        weights = self._gradients.mean(dim=(2, 3), keepdim=True)
        cam = (weights * self._feature_maps).sum(dim=1, keepdim=True)
        cam = torch.relu(cam).squeeze().cpu().numpy()

        self._blend_and_save(image, cam, analysis_id)
        return f"/api/heatmap/{analysis_id}"

    def _blend_and_save(
        self,
        original: Image.Image,
        cam: np.ndarray,
        analysis_id: str,
    ) -> Path:
        import cv2

        w, h = original.size[0], original.size[1]
        cam_resized = cv2.resize(cam, (w, h))
        cam_norm = cv2.normalize(cam_resized, None, 0, 255, cv2.NORM_MINMAX)
        cam_uint8 = cam_norm.astype(np.uint8)

        heatmap_bgr = cv2.applyColorMap(cam_uint8, cv2.COLORMAP_JET)
        original_bgr = cv2.cvtColor(np.array(original.convert("RGB")), cv2.COLOR_RGB2BGR)
        blended = cv2.addWeighted(original_bgr, 0.55, heatmap_bgr, 0.45, 0)

        output_path = settings.heatmap_dir / f"{analysis_id}.png"
        cv2.imwrite(str(output_path), blended)
        return output_path

    def _generate_mock_heatmap(self, image: Image.Image, analysis_id: str) -> str:

        w, h = image.size[0], image.size[1]
        canvas = np.zeros((h, w), dtype=np.float32)

        for cx, cy, sigma in [
            (int(w * 0.5), int(h * 0.3), min(w, h) * 0.12),
            (int(w * 0.35), int(h * 0.55), min(w, h) * 0.08),
            (int(w * 0.65), int(h * 0.55), min(w, h) * 0.08),
        ]:
            y_grid, x_grid = np.ogrid[:h, :w]
            blob = np.exp(-((x_grid - cx) ** 2 + (y_grid - cy) ** 2) / (2 * sigma**2))
            canvas += blob

        self._blend_and_save(image, canvas, analysis_id)
        return f"/api/heatmap/{analysis_id}"


gradcam_engine: GradCAMEngine | None = None


def init_gradcam(model: nn.Module | None) -> None:
    global gradcam_engine
    gradcam_engine = GradCAMEngine(model)
