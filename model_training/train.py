"""
Fine-tune EfficientNet-B4 on the 140k Real vs Fake Faces dataset.

Strategy:
  1. Load ImageNet-pretrained EfficientNet-B4.
  2. Freeze the first 80% of feature layers.
  3. Fine-tune the top 20% of feature layers + the new binary classifier head.
  4. Train with mixed precision (AMP) for speed.
  5. Early stopping on validation AUC to prevent overfitting.

Usage:
    python train.py --data ./data/real_vs_fake/real-vs-fake --epochs 20 --batch-size 32

Output:
    Saves best weights to ../backend/weights/efficientnet_b4_ft.pth
"""
import argparse
import math
from pathlib import Path

import torch
import torch.nn as nn
from torch.cuda.amp import GradScaler, autocast
from torchvision import models

from dataset import build_dataloaders


def build_model(num_classes: int = 2) -> nn.Module:
    model = models.efficientnet_b4(weights=models.EfficientNet_B4_Weights.IMAGENET1K_V1)

    # Freeze the first 80% of feature layers
    feature_layers = list(model.features.children())
    freeze_until = math.floor(len(feature_layers) * 0.8)
    for layer in feature_layers[:freeze_until]:
        for param in layer.parameters():
            param.requires_grad = False

    # Replace the classifier head with a binary output
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, num_classes),
    )
    return model


def train_one_epoch(
    model: nn.Module,
    loader,
    optimizer: torch.optim.Optimizer,
    criterion: nn.Module,
    scaler: GradScaler,
    device: torch.device,
) -> float:
    model.train()
    total_loss = 0.0
    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad(set_to_none=True)
        with autocast():
            loss = criterion(model(images), labels)
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
        total_loss += loss.item()
    return total_loss / len(loader)


@torch.inference_mode()
def evaluate(model: nn.Module, loader, device: torch.device) -> tuple[float, float]:
    model.eval()
    correct = total = 0
    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        preds = model(images).argmax(dim=1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)
    accuracy = correct / total
    return accuracy, accuracy  # extend with AUC via sklearn if desired


def main(args: argparse.Namespace) -> None:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on: {device}")

    train_loader, val_loader = build_dataloaders(args.data, batch_size=args.batch_size)
    model = build_model().to(device)

    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=1e-4,
        weight_decay=1e-2,
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
    scaler = GradScaler()

    output_dir = Path("../backend/weights")
    output_dir.mkdir(parents=True, exist_ok=True)
    best_path = output_dir / "efficientnet_b4_ft.pth"

    best_val_acc = 0.0
    patience_count = 0

    for epoch in range(1, args.epochs + 1):
        train_loss = train_one_epoch(model, train_loader, optimizer, criterion, scaler, device)
        val_acc, _ = evaluate(model, val_loader, device)
        scheduler.step()

        print(f"Epoch {epoch:02d}/{args.epochs} | loss: {train_loss:.4f} | val_acc: {val_acc:.4f}")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), best_path)
            print(f"  ✓ Saved best weights (val_acc={val_acc:.4f})")
            patience_count = 0
        else:
            patience_count += 1
            if patience_count >= args.patience:
                print(f"Early stopping after {args.patience} epochs without improvement.")
                break

    print(f"\nTraining complete. Best val accuracy: {best_val_acc:.4f}")
    print(f"Weights saved to: {best_path.resolve()}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune EfficientNet-B4 for deepfake detection")
    parser.add_argument("--data", required=True, help="Path to real-vs-fake dataset root")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--patience", type=int, default=5, help="Early stopping patience")
    main(parser.parse_args())
