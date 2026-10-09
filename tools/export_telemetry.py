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
