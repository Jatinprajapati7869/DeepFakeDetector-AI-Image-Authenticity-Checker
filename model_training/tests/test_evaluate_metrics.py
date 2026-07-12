from model_training.evaluate import compute_classification_metrics


def test_compute_classification_metrics_binary_case():
    report = compute_classification_metrics(
        labels=[0, 0, 1, 1],
        preds=[0, 1, 1, 1],
        positive_probs=[0.1, 0.6, 0.8, 0.9],
        class_names=["real", "fake"],
        positive_class="fake",
    )

    assert report["accuracy"] == 0.75
    assert report["sample_count"] == 4
    assert report["confusion_matrix"] == [[1, 1], [0, 2]]
    assert report["per_class"]["fake"]["precision"] == 0.666667
    assert report["per_class"]["fake"]["recall"] == 1.0
    assert report["auc_roc"] == 1.0


def test_compute_classification_metrics_rejects_empty_input():
    try:
        compute_classification_metrics([], [], [], ["real", "fake"])
    except ValueError as exc:
        assert "empty" in str(exc)
    else:
        raise AssertionError("Expected empty label set to raise ValueError")
