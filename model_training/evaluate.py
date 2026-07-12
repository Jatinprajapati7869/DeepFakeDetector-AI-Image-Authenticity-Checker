"""
Evaluate an EfficientNet-B4 checkpoint on a labeled real/fake image dataset.

The metrics helpers are intentionally dependency-light and tested separately so
CI can validate metric math without downloading model weights or a dataset.

Dataset layout:
    DATA_ROOT/test/real/*.jpg
    DATA_ROOT/test/fake/*.jpg

Example:
    python model_training/evaluate.py \
      --data ./model_training/data/real_vs_fake/real-vs-fake \
      --weights ./backend/weights/efficientnet_b4_ft.pth \
      --output ./docs/results/metrics.json
"""

from __future__ import annotations

import argparse
import json
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np

IMAGE_SIZE = 380


def _safe_div(numerator: float, denominator: float) -> float:
    return 0.0 if denominator == 0 else numerator / denominator


def _confusion_matrix(
    labels: Sequence[int], preds: Sequence[int], num_classes: int
) -> list[list[int]]:
    matrix = [[0 for _ in range(num_classes)] for _ in range(num_classes)]
    for label, pred in zip(labels, preds, strict=True):
        matrix[int(label)][int(pred)] += 1
    return matrix


def _binary_auc(
    labels: Sequence[int], positive_probs: Sequence[float], positive_label: int
) -> float | None:
    positives = [
        score
        for label, score in zip(labels, positive_probs, strict=True)
        if label == positive_label
    ]
    negatives = [
        score
        for label, score in zip(labels, positive_probs, strict=True)
        if label != positive_label
    ]
    if not positives or not negatives:
        return None

    wins = 0.0
    total = len(positives) * len(negatives)
    for pos_score in positives:
        for neg_score in negatives:
            if pos_score > neg_score:
                wins += 1.0
            elif pos_score == neg_score:
                wins += 0.5
    return wins / total


def compute_classification_metrics(
    labels: Sequence[int],
    preds: Sequence[int],
    positive_probs: Sequence[float],
    class_names: Sequence[str],
    positive_class: str = "fake",
) -> dict[str, Any]:
    """Compute accuracy, per-class precision/recall/F1, confusion matrix, and AUC."""
    if not labels:
        raise ValueError("Cannot compute metrics for an empty label set.")
    if not (len(labels) == len(preds) == len(positive_probs)):
        raise ValueError("labels, preds, and positive_probs must have the same length.")
    if len(set(class_names)) != len(class_names):
        raise ValueError("class_names must be unique.")

    num_classes = len(class_names)
    matrix = _confusion_matrix(labels, preds, num_classes)
    correct = sum(1 for label, pred in zip(labels, preds, strict=True) if label == pred)
    per_class: dict[str, dict[str, float | int]] = {}

    for class_idx, class_name in enumerate(class_names):
        tp = matrix[class_idx][class_idx]
        fp = sum(
            matrix[row][class_idx] for row in range(num_classes) if row != class_idx
        )
        fn = sum(
            matrix[class_idx][col] for col in range(num_classes) if col != class_idx
        )
        support = sum(matrix[class_idx])
        precision = _safe_div(tp, tp + fp)
        recall = _safe_div(tp, tp + fn)
        f1 = _safe_div(2 * precision * recall, precision + recall)
        per_class[class_name] = {
            "precision": round(precision, 6),
            "recall": round(recall, 6),
            "f1": round(f1, 6),
            "support": support,
        }

    positive_label = (
        class_names.index(positive_class) if positive_class in class_names else 1
    )
    auc = _binary_auc(labels, positive_probs, positive_label)

    return {
        "accuracy": round(correct / len(labels), 6),
        "sample_count": len(labels),
        "class_names": list(class_names),
        "positive_class": class_names[positive_label],
        "per_class": per_class,
        "confusion_matrix": matrix,
        "auc_roc": None if auc is None else round(auc, 6),
    }


def _load_model(weights_path: Path, device):
    import torch
    import torch.nn as nn
    from torchvision import models

    model = models.efficientnet_b4(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, 2),
    )
    model.load_state_dict(
        torch.load(weights_path, map_location=device, weights_only=True)
    )
    model.eval()
    return model.to(device)


def run_evaluation(args: argparse.Namespace) -> dict[str, Any]:
    import torch
    from torchvision import datasets, transforms

    data_root = Path(args.data)
    weights_path = Path(args.weights)
    test_dir = data_root / "test"
    if not test_dir.exists():
        raise FileNotFoundError(f"Expected test directory at {test_dir}")
    if not weights_path.exists():
        raise FileNotFoundError(f"Weights file not found at {weights_path}")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = _load_model(weights_path, device)

    eval_transforms = transforms.Compose(
        [
            transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    dataset = datasets.ImageFolder(str(test_dir), transform=eval_transforms)
    loader = torch.utils.data.DataLoader(
        dataset,
        batch_size=args.batch_size,
        num_workers=args.num_workers,
        shuffle=False,
    )

    all_preds: list[int] = []
    all_labels: list[int] = []
    all_probs: list[float] = []

    with torch.inference_mode():
        for images, labels in loader:
            images = images.to(device)
            logits = model(images)
            probs = torch.softmax(logits, dim=1)[:, 1].cpu().numpy()
            preds = logits.argmax(dim=1).cpu().numpy()

            all_preds.extend(preds.tolist())
            all_labels.extend(labels.numpy().tolist())
            all_probs.extend(probs.tolist())

    metrics = compute_classification_metrics(
        labels=all_labels,
        preds=all_preds,
        positive_probs=all_probs,
        class_names=dataset.classes,
        positive_class=args.positive_class,
    )
    return {
        "schema_version": 1,
        "generated_at": datetime.now(UTC).isoformat(),
        "mode": "real_inference",
        "dataset_root": str(data_root),
        "test_dir": str(test_dir),
        "weights_path": str(weights_path),
        "image_size": IMAGE_SIZE,
        "metrics": metrics,
    }


def write_json_report(report: dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )


def print_summary(report: dict[str, Any]) -> None:
    metrics = report["metrics"]
    print(f"Samples: {metrics['sample_count']}")
    print(f"Accuracy: {metrics['accuracy']:.4f}")
    print(f"AUC-ROC: {metrics['auc_roc']}")
    print("Confusion matrix rows=actual, cols=predicted:")
    print(np.array(metrics["confusion_matrix"]))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Evaluate DeepFakeDetector real-mode weights."
    )
    parser.add_argument(
        "--data", required=True, help="Dataset root containing test/real and test/fake"
    )
    parser.add_argument("--weights", required=True, help="Path to .pth weights file")
    parser.add_argument(
        "--output", help="Optional JSON output path, e.g. docs/results/metrics.json"
    )
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--num-workers", type=int, default=4)
    parser.add_argument("--positive-class", default="fake")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    report = run_evaluation(args)
    print_summary(report)
    if args.output:
        write_json_report(report, Path(args.output))
        print(f"Wrote JSON report to {args.output}")


if __name__ == "__main__":
    main()
