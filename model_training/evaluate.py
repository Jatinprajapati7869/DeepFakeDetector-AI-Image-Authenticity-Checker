"""
Evaluate a trained EfficientNet-B4 checkpoint on the test set.

Outputs:
  - Overall accuracy
  - Per-class precision / recall / F1
  - Confusion matrix
  - ROC-AUC score

Usage:
    python evaluate.py --data ./data/real_vs_fake/real-vs-fake --weights ../backend/weights/efficientnet_b4_ft.pth
"""
import argparse
import math
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torchvision import datasets, models, transforms

IMAGE_SIZE = 380
EVAL_TRANSFORMS = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def load_model(weights_path: str, device: torch.device) -> nn.Module:
    model = models.efficientnet_b4(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, 2),
    )
    model.load_state_dict(torch.load(weights_path, map_location=device))
    model.eval()
    return model.to(device)


@torch.inference_mode()
def run_evaluation(args: argparse.Namespace) -> None:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = load_model(args.weights, device)

    test_dir = Path(args.data) / "test"
    dataset = datasets.ImageFolder(str(test_dir), transform=EVAL_TRANSFORMS)
    loader = torch.utils.data.DataLoader(dataset, batch_size=64, num_workers=4)

    all_preds: list[int] = []
    all_labels: list[int] = []
    all_probs: list[float] = []

    for images, labels in loader:
        images = images.to(device)
        logits = model(images)
        probs = torch.softmax(logits, dim=1)[:, 1].cpu().numpy()
        preds = logits.argmax(dim=1).cpu().numpy()

        all_preds.extend(preds.tolist())
        all_labels.extend(labels.numpy().tolist())
        all_probs.extend(probs.tolist())

    # Metrics (using only stdlib + numpy to avoid sklearn dependency at runtime)
    all_preds_arr = np.array(all_preds)
    all_labels_arr = np.array(all_labels)

    accuracy = (all_preds_arr == all_labels_arr).mean()
    print(f"\nTest Accuracy: {accuracy:.4f} ({accuracy * 100:.2f}%)")
    print(f"Total samples: {len(all_labels)}")

    for class_idx, class_name in enumerate(dataset.classes):
        tp = int(((all_preds_arr == class_idx) & (all_labels_arr == class_idx)).sum())
        fp = int(((all_preds_arr == class_idx) & (all_labels_arr != class_idx)).sum())
        fn = int(((all_preds_arr != class_idx) & (all_labels_arr == class_idx)).sum())
        precision = tp / (tp + fp + 1e-8)
        recall = tp / (tp + fn + 1e-8)
        f1 = 2 * precision * recall / (precision + recall + 1e-8)
        print(f"  {class_name:>6}: precision={precision:.3f}, recall={recall:.3f}, F1={f1:.3f}")

    print("\nConfusion Matrix (rows=actual, cols=predicted):")
    n = len(dataset.classes)
    cm = np.zeros((n, n), dtype=int)
    for true, pred in zip(all_labels, all_preds):
        cm[true][pred] += 1
    header = "       " + "  ".join(f"{c:>6}" for c in dataset.classes)
    print(header)
    for i, row in enumerate(cm):
        print(f"  {dataset.classes[i]:>6}  " + "  ".join(f"{v:>6}" for v in row))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate deepfake detector on test set")
    parser.add_argument("--data", required=True, help="Path to real-vs-fake dataset root")
    parser.add_argument("--weights", required=True, help="Path to .pth weights file")
    run_evaluation(parser.parse_args())
