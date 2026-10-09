"""Synthetic biometric telemetry generator for circadian sleep profiles."""

import random
import time
from typing import List, Dict, Any
from tools.telemetry_schema import BiometricEpochTelemetry, SleepPhaseDuration

def generate_normal_profile(subject_id: str, timestamp: int) -> BiometricEpochTelemetry:
    """Generates a physiologically plausible circadian sleep epoch."""
    total_sleep = round(random.uniform(6.8, 8.6), 2)
    total_minutes = total_sleep * 60.0
    
    rem = round(total_minutes * random.uniform(0.20, 0.25), 1)
    deep = round(total_minutes * random.uniform(0.18, 0.24), 1)
    wake = round(random.uniform(15.0, 35.0), 1)
    light = max(0.0, round(total_minutes - (rem + deep + wake), 1))
    
    hrv = round(random.uniform(50.0, 85.0), 1)
    rhr = round(random.uniform(48.0, 62.0), 1)
    movement = round(random.uniform(2.5, 7.0), 2)
    
    return BiometricEpochTelemetry(
        subject_id=subject_id,
        timestamp=timestamp,
        total_sleep_hours=total_sleep,
        hrv_rmssd_ms=hrv,
        resting_heart_rate_bpm=rhr,
        movement_index=movement,
        phases=SleepPhaseDuration(
            rem_minutes=rem,
            deep_minutes=deep,
            light_minutes=light,
            wake_minutes=wake
        ),
        is_adversarial_spoof=False,
        authenticity_label=1
    )

def generate_fragmented_profile(subject_id: str, timestamp: int) -> BiometricEpochTelemetry:
    """Generates high micro-arousal, sleep-deprived or fragmented biometric sleep epoch."""
    total_sleep = round(random.uniform(4.0, 5.8), 2)
    total_minutes = total_sleep * 60.0
    
    rem = round(total_minutes * random.uniform(0.10, 0.15), 1)
    deep = round(total_minutes * random.uniform(0.08, 0.14), 1)
    wake = round(random.uniform(60.0, 110.0), 1)
    light = max(0.0, round(total_minutes - (rem + deep + wake), 1))
    
    hrv = round(random.uniform(25.0, 45.0), 1)
    rhr = round(random.uniform(65.0, 82.0), 1)
    movement = round(random.uniform(14.0, 26.0), 2)
    
    return BiometricEpochTelemetry(
        subject_id=subject_id,
        timestamp=timestamp,
        total_sleep_hours=total_sleep,
        hrv_rmssd_ms=hrv,
        resting_heart_rate_bpm=rhr,
        movement_index=movement,
        phases=SleepPhaseDuration(
            rem_minutes=rem,
            deep_minutes=deep,
            light_minutes=light,
            wake_minutes=wake
        ),
        is_adversarial_spoof=False,
        authenticity_label=1
    )
