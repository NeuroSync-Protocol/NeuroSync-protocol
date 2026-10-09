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

def compute_classification_metrics(y_true: List[int], y_pred: List[int]) -> Dict[str, Any]:
    """Calculates confusion matrix components, precision, recall, and F1 score."""
    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 1)
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 0)
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 1)
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 0)
    
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    accuracy = (tp + tn) / len(y_true) if len(y_true) > 0 else 0.0
    
    return {
        "true_positives": tp,
        "true_negatives": tn,
        "false_positives": fp,
        "false_negatives": fn,
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4)
    }
