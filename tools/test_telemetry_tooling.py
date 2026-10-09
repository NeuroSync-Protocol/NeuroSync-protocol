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
