#!/usr/bin/env python3
"""
Oracle Model Evaluation Pipeline

Benchmarks the scikit-learn sleep quality model / classifier pipeline against
both physiologically valid datasets and synthetic spoofed datasets.
Computes anomaly detection metrics, regression deviations, classification
confusion matrices, and precision/recall/F1 scores.
"""

import os
import sys
import json
import joblib
import argparse
import numpy as np
import pandas as pd
from sklearn.metrics import (
    confusion_matrix,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score
)

# Required feature columns expected by the trained pipeline
MODEL_FEATURE_COLS = [
    "Sleep_Duration", "Stress_Level", "Physical_Activity_Level",
    "Daily_Steps", "Heart_Rate", "Age", "Gender",
    "BMI_Category", "Sleep_Disorder", "Occupation"
]

def load_oracle_model(model_path: str):
    """Loads the pre-trained Oracle model pipeline."""
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Oracle model pipeline not found at: {model_path}")
    return joblib.load(model_path)


def evaluate_model_pipeline(
    model,
    dataset: pd.DataFrame,
    valid_score_threshold: float = 6.0,
    export_metrics_path: str = None
) -> dict:
    """
    Evaluates predictions from the model against valid and spoofed telemetry records.
    Computes confusion matrices, precision, recall, and F1 scores.
    """
    # 1. Extract feature subset
    X = dataset[MODEL_FEATURE_COLS].copy()
    y_true_spoofed = dataset["is_spoofed"].values

    # 2. Run model predictions
    raw_predictions = model.predict(X)
    raw_predictions = np.clip(raw_predictions, 1.0, 10.0)

    # 3. Anomaly / Spoof classification heuristic:
    # Telemetry records that predict below threshold or deviate from plausible physiology
    # In the oracle context:
    # Physiological spoof detection flags anomalous scores or bounds
    # A score < valid_score_threshold or extreme stress-sleep contradiction flags potential spoof
    y_pred_spoofed = np.zeros(len(dataset), dtype=int)
    
    # Flag based on physiological inconsistency rule + model output confidence
    for i, row in dataset.iterrows():
        pred_val = raw_predictions[i]
        hr = row["Heart_Rate"]
        hrv = row.get("Heart_Rate_Variability", 70)
        movement = row.get("Movement_Index", 10.0)
        duration = row["Sleep_Duration"]

        # Anomaly heuristic score
        is_anomalous = False
        if duration > 14.0 or duration < 1.0:
            is_anomalous = True
        elif hr < 40 or hr > 120:
            is_anomalous = True
        elif hrv > 200 or hrv < 25:
            is_anomalous = True
        elif movement > 100.0:
            is_anomalous = True
        elif pred_val < valid_score_threshold and row["Stress_Level"] >= 9:
            is_anomalous = True

        if is_anomalous:
            y_pred_spoofed[i] = 1

    # 4. Compute Metrics
    cm = confusion_matrix(y_true_spoofed, y_pred_spoofed)
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)

    f1 = float(f1_score(y_true_spoofed, y_pred_spoofed, zero_division=0))
    precision = float(precision_score(y_true_spoofed, y_pred_spoofed, zero_division=0))
    recall = float(recall_score(y_true_spoofed, y_pred_spoofed, zero_division=0))

    try:
        auc = float(roc_auc_score(y_true_spoofed, y_pred_spoofed))
    except Exception:
        auc = 0.0

    report = classification_report(
        y_true_spoofed,
        y_pred_spoofed,
        target_names=["Valid Telemetry", "Spoofed Anomaly"],
        output_dict=True,
        zero_division=0
    )

    valid_mask = y_true_spoofed == 0
    spoofed_mask = y_true_spoofed == 1

    results = {
        "total_evaluated_samples": len(dataset),
        "valid_samples": int(valid_mask.sum()),
        "spoofed_samples": int(spoofed_mask.sum()),
        "mean_sleep_score_valid": float(np.mean(raw_predictions[valid_mask])) if valid_mask.sum() > 0 else 0.0,
        "mean_sleep_score_spoofed": float(np.mean(raw_predictions[spoofed_mask])) if spoofed_mask.sum() > 0 else 0.0,
        "confusion_matrix": {
            "true_negative": int(tn),
            "false_positive": int(fp),
            "false_negative": int(fn),
            "true_positive": int(tp)
        },
        "metrics": {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4)
        },
        "classification_report": report
    }

    if export_metrics_path:
        os.makedirs(os.path.dirname(os.path.abspath(export_metrics_path)), exist_ok=True)
        with open(export_metrics_path, "w") as f:
            json.dump(results, f, indent=2)

    return results


def print_evaluation_summary(results: dict):
    """Prints a clean CLI report of the evaluation."""
    print("=" * 64)
    print(" NEUROSYNC ORACLE MODEL EVALUATION PIPELINE")
    print("=" * 64)
    print(f"Total Evaluated Samples: {results['total_evaluated_samples']}")
    print(f"  • Valid Telemetry:   {results['valid_samples']}")
    print(f"  • Spoofed Telemetry: {results['spoofed_samples']}")
    print("-" * 64)
    print(f"Mean Predicted Score (Valid):   {results['mean_sleep_score_valid']:.2f} / 10.0")
    print(f"Mean Predicted Score (Spoofed): {results['mean_sleep_score_spoofed']:.2f} / 10.0")
    print("-" * 64)
    cm = results["confusion_matrix"]
    print("Confusion Matrix:")
    print(f"                Actual Valid    Actual Spoofed")
    print(f"  Pred Valid:    TN={cm['true_negative']:<10}  FN={cm['false_negative']:<10}")
    print(f"  Pred Spoof:    FP={cm['false_positive']:<10}  TP={cm['true_positive']:<10}")
    print("-" * 64)
    metrics = results["metrics"]
    print("Benchmark Metrics:")
    print(f"  Precision: {metrics['precision']:.4f}")
    print(f"  Recall:    {metrics['recall']:.4f}")
    print(f"  F1 Score:  {metrics['f1_score']:.4f}")
    print(f"  ROC-AUC:   {metrics['roc_auc']:.4f}")
    print("=" * 64)


def main():
    parser = argparse.ArgumentParser(description="Evaluate Oracle model on valid and spoofed telemetry")
    parser.add_argument("--model-path", type=str, default="api/sleep_quality_model.pkl", help="Path to sleep quality pipeline pickle")
    parser.add_argument("--dataset-path", type=str, default=None, help="Path to synthetic or evaluated dataset CSV")
    parser.add_argument("--export-json", type=str, default="tools/oracle_evaluation_metrics.json", help="Path to save evaluation metrics JSON")

    args = parser.parse_args()

    # If dataset path is not specified, generate dataset on the fly
    if not args.dataset_path or not os.path.exists(args.dataset_path):
        from tools.generate_synthetic_telemetry import generate_dataset
        print("Generating synthetic telemetry evaluation benchmark (1,000 samples)...")
        dataset = generate_dataset(n_samples=1000, spoof_ratio=0.25, seed=42)
    else:
        dataset = pd.read_csv(args.dataset_path)

    model = load_oracle_model(args.model_path)
    results = evaluate_model_pipeline(
        model=model,
        dataset=dataset,
        export_metrics_path=args.export_json
    )
    print_evaluation_summary(results)


if __name__ == "__main__":
    main()
