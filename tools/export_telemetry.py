"""Researcher telemetry data export utility supporting sanitization and multiple formats."""

import hashlib
import json
import csv
from typing import List, Dict, Any
from tools.telemetry_schema import BiometricEpochTelemetry

def sanitize_subject_id(raw_id: str, salt: str = "neurosync_salt_v1") -> str:
    """Anonymizes subject identifier using salted SHA-256 hash digest."""
    return "anon_" + hashlib.sha256(f"{salt}_{raw_id}".encode()).hexdigest()[:12]

def sanitize_record(record: BiometricEpochTelemetry) -> Dict[str, Any]:
    """Sanitizes telemetry record for research compliance (HIPAA / GDPR)."""
    raw_dict = record.model_dump()
    raw_dict["subject_id"] = sanitize_subject_id(raw_dict["subject_id"])
    return raw_dict

def export_to_csv(
    records: List[BiometricEpochTelemetry],
    output_path: str,
    columns: List[str] = None
):
    """Exports sanitized telemetry records into CSV format with custom columns."""
    if columns is None:
        columns = [
            "subject_id", "timestamp", "total_sleep_hours", "hrv_rmssd_ms",
            "resting_heart_rate_bpm", "movement_index", "authenticity_label"
        ]
        
    sanitized_rows = [sanitize_record(r) for r in records]
    with open(output_path, mode="w", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        for row in sanitized_rows:
            writer.writerow(row)
