"""Offline ML Oracle evaluation test harness against synthetic biometric datasets."""

import os
import joblib
import numpy as np
from typing import List, Dict, Any, Tuple
from tools.telemetry_schema import BiometricEpochTelemetry
from tools.generate_synthetic_telemetry import generate_telemetry_dataset

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "api", "sleep_quality_model.pkl")

def extract_features(record: BiometricEpochTelemetry) -> List[float]:
    """Extracts ML input feature vector consistent with model training."""
    return [
        record.total_sleep_hours,
        record.hrv_rmssd_ms,
        record.resting_heart_rate_bpm,
        record.movement_index,
        record.phases.rem_minutes,
        record.phases.deep_minutes
    ]

def load_oracle_model():
    """Loads the serialized scikit-learn classifier."""
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None
