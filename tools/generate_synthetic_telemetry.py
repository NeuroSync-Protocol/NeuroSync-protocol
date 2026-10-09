#!/usr/bin/env python3
"""
Synthetic Biometric Telemetry Dataset Generator

Generates physiologically plausible sleep streams (HRV, duration, movement indices,
stress levels, resting heart rates) alongside deliberate anomaly edge cases (spoofed,
adversarial, or physiologically impossible data) for testing and evaluating the Oracle model.
"""

import os
import json
import random
import argparse
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple


VALID_GENDERS = ["Male", "Female"]
VALID_BMI = ["Normal", "Normal Weight", "Overweight", "Obese"]
VALID_DISORDERS = ["None", "Sleep Apnea", "Insomnia"]
VALID_OCCUPATIONS = [
    "Software Engineer", "Doctor", "Nurse", "Accountant",
    "Teacher", "Engineer", "Lawyer", "Salesperson",
    "Scientist", "Manager"
]

def generate_valid_record(rng: np.random.Generator) -> Dict[str, Any]:
    """Generates a physiologically plausible sleep record."""
    gender = rng.choice(VALID_GENDERS)
    age = int(rng.integers(21, 65))
    occupation = rng.choice(VALID_OCCUPATIONS)
    bmi = rng.choice(VALID_BMI, p=[0.50, 0.15, 0.25, 0.10])
    disorder = rng.choice(VALID_DISORDERS, p=[0.70, 0.18, 0.12])

    # Correlated physiological features
    stress_level = int(rng.integers(1, 9))
    if disorder != "None":
        stress_level = min(10, stress_level + int(rng.integers(1, 3)))

    # Sleep duration negatively correlated with stress
    base_sleep = 8.5 - (stress_level * 0.35) + rng.normal(0, 0.4)
    sleep_duration = round(float(np.clip(base_sleep, 4.5, 9.5)), 1)

    # Physical activity & steps
    activity = int(rng.integers(30, 95))
    steps = int(activity * rng.integers(100, 160) + rng.integers(500, 2000))

    # Heart Rate & HRV
    base_hr = 60 + (stress_level * 2.2) - (activity * 0.1) + rng.normal(0, 3)
    heart_rate = int(np.clip(base_hr, 52, 95))
    hrv = int(np.clip(95 - (stress_level * 5.5) + (activity * 0.2) + rng.normal(0, 5), 35, 120))
    movement_index = round(float(np.clip((10 - sleep_duration) * 1.5 + (stress_level * 1.2) + rng.normal(0, 1), 2.0, 25.0)), 2)

    return {
        "Sleep_Duration": sleep_duration,
        "Stress_Level": stress_level,
        "Physical_Activity_Level": activity,
        "Daily_Steps": steps,
        "Heart_Rate": heart_rate,
        "Age": age,
        "Gender": str(gender),
        "BMI_Category": str(bmi),
        "Sleep_Disorder": str(disorder),
        "Occupation": str(occupation),
        "Heart_Rate_Variability": hrv,
        "Movement_Index": movement_index,
        "is_spoofed": 0,
        "anomaly_type": "none"
    }


def generate_spoofed_record(rng: np.random.Generator) -> Dict[str, Any]:
    """Generates an anomalous or spoofed telemetry record violating physiological bounds."""
    anomaly_types = [
        "hyper_duration_flat_hr",      # 14+ hrs sleep duration with impossible flat heart rate
        "extreme_step_zero_hr",        # 60,000 steps with 30 BPM heart rate
        "impossible_hrv_spike",        # 250 ms HRV under maximum reported stress
        "contradictory_sleep_stress",  # 10 hrs sleep duration with 10/10 stress and 140 BPM heart rate
        "erratic_movement_artifact",   # Sensor desync movement index > 150
        "negative_or_extreme_outlier"  # Sub-zero/out of bound duration
    ]

    chosen_anomaly = str(rng.choice(anomaly_types))
    base = generate_valid_record(rng)
    base["is_spoofed"] = 1
    base["anomaly_type"] = chosen_anomaly

    if chosen_anomaly == "hyper_duration_flat_hr":
        base["Sleep_Duration"] = round(float(rng.uniform(14.0, 22.0)), 1)
        base["Heart_Rate"] = 40
        base["Heart_Rate_Variability"] = 180
        base["Movement_Index"] = 0.05
    elif chosen_anomaly == "extreme_step_zero_hr":
        base["Daily_Steps"] = int(rng.integers(55000, 120000))
        base["Physical_Activity_Level"] = 100
        base["Heart_Rate"] = int(rng.integers(28, 38))
        base["Heart_Rate_Variability"] = 210
    elif chosen_anomaly == "impossible_hrv_spike":
        base["Stress_Level"] = 10
        base["Heart_Rate"] = 115
        base["Heart_Rate_Variability"] = int(rng.integers(220, 350))
    elif chosen_anomaly == "contradictory_sleep_stress":
        base["Sleep_Duration"] = 11.5
        base["Stress_Level"] = 10
        base["Heart_Rate"] = int(rng.integers(125, 160))
        base["Movement_Index"] = 85.0
    elif chosen_anomaly == "erratic_movement_artifact":
        base["Movement_Index"] = round(float(rng.uniform(160.0, 450.0)), 2)
        base["Heart_Rate"] = int(rng.integers(110, 145))
        base["Sleep_Duration"] = 2.0
    elif chosen_anomaly == "negative_or_extreme_outlier":
        base["Sleep_Duration"] = 0.2
        base["Stress_Level"] = 10
        base["Heart_Rate"] = 150
        base["Daily_Steps"] = 0

    return base


def generate_dataset(
    n_samples: int = 1000,
    spoof_ratio: float = 0.2,
    seed: int = 42
) -> pd.DataFrame:
    """Generates synthetic dataset containing valid and spoofed sleep records."""
    rng = np.random.default_rng(seed)
    n_spoofed = int(n_samples * spoof_ratio)
    n_valid = n_samples - n_spoofed

    records: List[Dict[str, Any]] = []
    for _ in range(n_valid):
        records.append(generate_valid_record(rng))

    for _ in range(n_spoofed):
        records.append(generate_spoofed_record(rng))

    # Shuffle dataset
    rng.shuffle(records)
    return pd.DataFrame(records)


def main():
    parser = argparse.ArgumentParser(description="Synthetic Biometric Telemetry Dataset Generator")
    parser.add_argument("--samples", type=int, default=1000, help="Number of telemetry samples to generate")
    parser.add_argument("--spoof-ratio", type=float, default=0.20, help="Ratio of anomalous/spoofed records (0.0 to 1.0)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--output", type=str, default="tools/synthetic_telemetry.csv", help="Output CSV path")
    parser.add_argument("--format", type=str, choices=["csv", "json"], default="csv", help="Output file format")

    args = parser.parse_args()

    df = generate_dataset(n_samples=args.samples, spoof_ratio=args.spoof_ratio, seed=args.seed)

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    if args.format == "csv" or args.output.endswith(".csv"):
        df.to_csv(args.output, index=False)
    else:
        df.to_json(args.output, orient="records", indent=2)

    print(f"Generated {len(df)} synthetic biometric records:")
    print(f" - Valid records: {(df['is_spoofed'] == 0).sum()}")
    print(f" - Spoofed/Anomalous records: {(df['is_spoofed'] == 1).sum()}")
    print(f" - Saved to: {args.output}")


if __name__ == "__main__":
    main()
