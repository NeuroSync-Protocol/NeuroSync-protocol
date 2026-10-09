"""Test suite for synthetic telemetry generator, Oracle evaluation, and export tooling."""

import pytest
from tools.generate_synthetic_telemetry import (
    generate_normal_profile,
    generate_fragmented_profile,
    generate_adversarial_spoof,
    generate_telemetry_dataset
)
from tools.evaluate_oracle_model import compute_classification_metrics, run_evaluation
from tools.export_telemetry import sanitize_subject_id, sanitize_record

def test_normal_profile_distribution():
    record = generate_normal_profile("sub_0001", 1700000000)
    assert 6.0 <= record.total_sleep_hours <= 9.5
    assert 40.0 <= record.hrv_rmssd_ms <= 95.0
    assert record.is_adversarial_spoof is False
    assert record.authenticity_label == 1

def test_adversarial_generator_anomaly_flags():
    spoof = generate_adversarial_spoof("sub_bad", 1700000000)
    assert spoof.is_adversarial_spoof is True
    assert spoof.authenticity_label == 0
    # Implausible biological signal checks
    assert spoof.hrv_rmssd_ms > 100.0 or spoof.total_sleep_hours > 15.0 or spoof.movement_index < 0.05

def test_sanitization_and_masking():
    raw_id = "user_wallet_GBABC123456789"
    masked_id = sanitize_subject_id(raw_id)
    assert masked_id.startswith("anon_")
    assert raw_id not in masked_id
    assert len(masked_id) > 10

def test_evaluation_pipeline_metrics():
    result = run_evaluation(n_samples=50)
    metrics = result["metrics"]
    assert "f1_score" in metrics
    assert "accuracy" in metrics
    assert metrics["accuracy"] >= 0.8
    assert "NeuroSync Oracle Model Evaluation Report" in result["report"]
