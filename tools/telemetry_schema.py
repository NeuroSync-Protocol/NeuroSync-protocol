"""Physiological telemetry Pydantic schemas for the NeuroSync protocol."""

from typing import List, Optional
from pydantic import BaseModel, Field

class SleepPhaseDuration(BaseModel):
    rem_minutes: float = Field(..., ge=0, description="REM sleep duration in minutes")
    deep_minutes: float = Field(..., ge=0, description="Deep (SWS) sleep duration in minutes")
    light_minutes: float = Field(..., ge=0, description="Light sleep duration in minutes")
    wake_minutes: float = Field(..., ge=0, description="Awake duration in minutes")

class BiometricEpochTelemetry(BaseModel):
    subject_id: str = Field(..., description="Anonymized subject identifier")
    timestamp: int = Field(..., description="Epoch UNIX timestamp in seconds")
    total_sleep_hours: float = Field(..., ge=0, le=24, description="Total sleep hours")
    hrv_rmssd_ms: float = Field(..., ge=0, description="Root mean square of successive RR interval differences")
    resting_heart_rate_bpm: float = Field(..., ge=30, le=220, description="Resting heart rate in BPM")
    movement_index: float = Field(..., ge=0, description="Actigraphy movement variance metric")
    phases: SleepPhaseDuration
    is_adversarial_spoof: bool = Field(default=False, description="Flag indicating synthetic adversarial data injection")
    authenticity_label: int = Field(default=1, ge=0, le=1, description="1 for authentic human biometrics, 0 for spoof")

class BatchTelemetryPayload(BaseModel):
    epoch_batch_id: str
    generated_at: int
    records: List[BiometricEpochTelemetry]
