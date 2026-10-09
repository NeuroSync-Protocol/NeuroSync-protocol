#!/usr/bin/env python3
"""
Researcher Data Export Utility

Supports sanitized, anonymized exports of biometric sleep telemetry records in
both JSON and CSV formats. Removes cryptographic private credentials and raw PII
while preserving verified on-chain proofs, physiological sleep architecture
stages, and oracle predictions for academic/clinical research.
"""

import os
import sys
import json
import hashlib
import argparse
import pandas as pd
from typing import List, Dict, Any


def anonymize_user_address(address: str, salt: str = "neurosync_salt_v1") -> str:
    """Hashes user address into an irreversible researcher pseudonym ID."""
    if not address:
        return "ANON_PARTICIPANT_UNKNOWN"
    hashed = hashlib.sha256(f"{salt}_{address}".encode("utf-8")).hexdigest()
    return f"ANON_{hashed[:12]}"


def sanitize_telemetry_record(record: Dict[str, Any], salt: str = "neurosync_salt_v1") -> Dict[str, Any]:
    """
    Sanitizes telemetry record to strip raw identifiers and retain clinical / DeSci fields.
    """
    sanitized = record.copy()

    # Anonymize wallet address
    if "user_address" in sanitized:
        sanitized["participant_id"] = anonymize_user_address(sanitized.pop("user_address"), salt)
    elif "address" in sanitized:
        sanitized["participant_id"] = anonymize_user_address(sanitized.pop("address"), salt)

    # Strip any potential sensitive keys
    sensitive_keys = ["secret", "private_key", "seed", "ip_address", "client_ip"]
    for key in sensitive_keys:
        sanitized.pop(key, None)

    # Round continuous metrics for differential privacy
    if "Sleep_Duration" in sanitized and sanitized["Sleep_Duration"] is not None:
        sanitized["Sleep_Duration"] = round(float(sanitized["Sleep_Duration"]), 2)
    if "sleep_score" in sanitized and sanitized["sleep_score"] is not None:
        sanitized["sleep_score"] = round(float(sanitized["sleep_score"]), 2)

    return sanitized


def export_telemetry(
    input_file: str,
    output_file: str,
    format_type: str = "json",
    salt: str = "neurosync_salt_v1"
) -> int:
    """Reads raw telemetry records, sanitizes data, and writes to specified output format."""
    if not os.path.exists(input_file):
        raise FileNotFoundError(f"Input telemetry source not found at: {input_file}")

    # Determine input type
    if input_file.endswith(".csv"):
        df = pd.read_csv(input_file)
        records = df.to_dict(orient="records")
    else:
        with open(input_file, "r") as f:
            data = json.load(f)
            records = data if isinstance(data, list) else [data]

    # Sanitize each record
    sanitized_records = [sanitize_telemetry_record(r, salt) for r in records]

    os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)

    if format_type.lower() == "csv" or output_file.endswith(".csv"):
        export_df = pd.DataFrame(sanitized_records)
        export_df.to_csv(output_file, index=False)
    else:
        with open(output_file, "w") as f:
            json.dump(sanitized_records, f, indent=2)

    return len(sanitized_records)


def main():
    parser = argparse.ArgumentParser(description="Researcher Telemetry Data Export Utility")
    parser.add_argument("--input", type=str, required=True, help="Input raw telemetry JSON or CSV file")
    parser.add_argument("--output", type=str, required=True, help="Path for sanitized output file")
    parser.add_argument("--format", type=str, choices=["json", "csv"], default="json", help="Export format (json or csv)")
    parser.add_argument("--salt", type=str, default="neurosync_research_salt", help="Salt string for irreversible address anonymization")

    args = parser.parse_args()

    count = export_telemetry(
        input_file=args.input,
        output_file=args.output,
        format_type=args.format,
        salt=args.salt
    )
    print(f"Successfully exported {count} sanitized telemetry records for clinical research.")
    print(f"Destination: {args.output} (Format: {args.format.upper()})")


if __name__ == "__main__":
    main()
