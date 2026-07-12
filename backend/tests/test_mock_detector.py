from PIL import Image

from app.models.mock_detector import mock_predict


def test_mock_predict_is_deterministic_for_same_image():
    image = Image.new("RGB", (64, 64), color=(32, 96, 180))

    first = mock_predict(image)
    second = mock_predict(image)

    assert first == second


def test_mock_predict_returns_valid_schema_values():
    image = Image.new("RGB", (64, 64), color=(220, 180, 80))
    verdict, confidence = mock_predict(image)

    assert verdict in {"REAL", "FAKE"}
    assert 0.0 <= confidence <= 1.0
