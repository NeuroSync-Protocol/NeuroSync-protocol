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

def generate_adversarial_spoof(subject_id: str, timestamp: int) -> BiometricEpochTelemetry:
    """Injects biologically implausible adversarial telemetry attempting to game streak rewards."""
    spoof_type = random.choice(["constant_hrv", "impossible_duration", "zero_movement", "negative_phase_distribution"])
    
    if spoof_type == "constant_hrv":
        total_sleep = 8.0
        hrv = 195.0
        rhr = 40.0
        movement = 0.01
    elif spoof_type == "impossible_duration":
        total_sleep = 18.5
        hrv = 110.0
        rhr = 55.0
        movement = 1.0
    else:
        total_sleep = 9.0
        hrv = 240.0
        rhr = 35.0
        movement = 0.0
        
    return BiometricEpochTelemetry(
        subject_id=subject_id,
        timestamp=timestamp,
        total_sleep_hours=total_sleep,
        hrv_rmssd_ms=hrv,
        resting_heart_rate_bpm=rhr,
        movement_index=movement,
        phases=SleepPhaseDuration(
            rem_minutes=180.0,
            deep_minutes=200.0,
            light_minutes=160.0,
            wake_minutes=0.0
        ),
        is_adversarial_spoof=True,
        authenticity_label=0
    )

import json

def generate_telemetry_dataset(
    n_samples: int = 100,
    spoof_ratio: float = 0.2,
    fragmented_ratio: float = 0.2
) -> List[BiometricEpochTelemetry]:
    """Generates a diverse synthetic dataset across normal, fragmented, and spoofed profiles."""
    records = []
    base_ts = int(time.time()) - (n_samples * 86400)
    
    for i in range(n_samples):
        subject_id = f"sub_{i % 10:04d}"
        ts = base_ts + (i * 86400)
        roll = random.random()
        
        if roll < spoof_ratio:
            rec = generate_adversarial_spoof(subject_id, ts)
        elif roll < (spoof_ratio + fragmented_ratio):
            rec = generate_fragmented_profile(subject_id, ts)
        else:
            rec = generate_normal_profile(subject_id, ts)
            
        records.append(rec)
    return records

def export_ndjson(records: List[BiometricEpochTelemetry], filepath: str):
    """Exports records into Newline-Delimited JSON (NDJSON) format."""
    with open(filepath, 'w') as f:
        for r in records:
            f.write(r.model_dump_json() + '\n')
