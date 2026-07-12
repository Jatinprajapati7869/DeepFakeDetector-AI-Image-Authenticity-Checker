"""
DataLoader for the 140k Real and Fake Faces dataset.

Dataset source: https://www.kaggle.com/datasets/xhlulu/140k-real-and-fake-faces

Expected directory layout after download:
    data/
      real_vs_fake/
        real-vs-fake/
          train/
            real/   ← FFHQ real faces
            fake/   ← StyleGAN2 generated faces
          valid/
            real/
            fake/
          test/
            real/
            fake/

Usage:
    train_loader, val_loader = build_dataloaders("./data/real_vs_fake/real-vs-fake", batch_size=32)
"""

from pathlib import Path

import torch
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

# EfficientNet-B4 native input size
IMAGE_SIZE = 380

TRAIN_TRANSFORMS = transforms.Compose(
    [
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1),
        transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 0.5)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
)

EVAL_TRANSFORMS = transforms.Compose(
    [
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
)


def build_dataloaders(
    root: str,
    batch_size: int = 32,
    num_workers: int = 4,
) -> tuple[DataLoader, DataLoader]:
    root_path = Path(root)
    train_dir = root_path / "train"
    val_dir = root_path / "valid"

    if not train_dir.exists():
        raise FileNotFoundError(
            f"Training directory not found at {train_dir}. "
            "Download the dataset from Kaggle first."
        )

    train_dataset = datasets.ImageFolder(str(train_dir), transform=TRAIN_TRANSFORMS)
    val_dataset = datasets.ImageFolder(str(val_dir), transform=EVAL_TRANSFORMS)

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
    )

    print(f"Train: {len(train_dataset):,} images | Val: {len(val_dataset):,} images")
    print(f"Classes: {train_dataset.classes}")
    return train_loader, val_loader
