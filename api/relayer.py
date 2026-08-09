import os
import json
import time
import urllib.request
import pandas as pd
import numpy as np
import joblib
from typing import Optional
from pydantic import BaseModel
from stellar_sdk import (
    Keypair,
    TransactionBuilder,
    TransactionEnvelope,
    FeeBumpTransactionEnvelope,
    Server,
    SorobanServer,
    Network
)

NETWORK_PASSPHRASE = Network.TESTNET_NETWORK_PASSPHRASE
HORIZON_URL = "https://horizon-testnet.stellar.org"
SOROBAN_RPC_URL = os.environ.get("SOROBAN_RPC_URL", "https://soroban-testnet.stellar.org:443")
DISTRIBUTOR_CONTRACT_ID = os.environ.get("DISTRIBUTOR_CONTRACT_ID") or os.environ.get("NEXT_PUBLIC_DISTRIBUTOR_CONTRACT_ID") or "CC42VJLNLOCRSJHX3VXSVR3KOZG2YGFNT6TUEF2DV6TXYS6FGYMESQ3V"
TOKEN_CONTRACT_ID = os.environ.get("TOKEN_CONTRACT_ID") or os.environ.get("NEXT_PUBLIC_TOKEN_CONTRACT_ID") or "CCBJ36QQMCTII5O3NLCUMEU2O3T2WZAM6ZYUNT4WOHGGMOS2R7JSAHDT"


# Initialize Relayer Keypair
relayer_secret = os.environ.get("RELAYER_SECRET") or os.environ.get("ORACLE_SECRET")
if relayer_secret:
    relayer_keypair = Keypair.from_secret(relayer_secret)
else:
    relayer_secret_path = os.path.join(os.path.dirname(__file__), ".relayer_secret")
    if os.path.exists(relayer_secret_path):
        with open(relayer_secret_path, "r") as f:
            relayer_secret = f.read().strip()
        relayer_keypair = Keypair.from_secret(relayer_secret)
    else:
        # Check oracle secret fallback
        oracle_secret_path = os.path.join(os.path.dirname(__file__), ".oracle_secret")
        if os.path.exists(oracle_secret_path):
            with open(oracle_secret_path, "r") as f:
                relayer_secret = f.read().strip()
            relayer_keypair = Keypair.from_secret(relayer_secret)
        else:
            relayer_keypair = Keypair.random()
            try:
                with open(relayer_secret_path, "w") as f:
                    f.write(relayer_keypair.secret)
            except Exception:
                pass


def ensure_relayer_funded(relayer_pubkey: str = None) -> bool:
    """
    Checks if the Relayer wallet has XLM balance on Testnet.
    If balance is low or missing, automatically requests funds from Stellar Friendbot.
    """
    pubkey = relayer_pubkey or relayer_keypair.public_key
    try:
        server = Server(HORIZON_URL)
        try:
            account_info = server.accounts().account_id(pubkey).call()
            balances = account_info.get("balances", [])
            xlm = sum(float(b["balance"]) for b in balances if b.get("asset_type") == "native")
            if xlm >= 5.0:
                return True
        except Exception:
            pass  # Account does not exist on testnet yet

        print(f"Funding Gas Master Relayer account ({pubkey}) via Stellar Friendbot...")
        url = f"https://friendbot.stellar.org/?addr={pubkey}"
        req = urllib.request.Request(url, headers={"User-Agent": "NeuroSync-GasMaster/1.0"})
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode("utf-8")
            print("Friendbot funding response:", res_data)
        return True
    except Exception as err:
        print(f"Warning: Relayer funding via Friendbot encountered issue: {err}")
        return False


def wrap_and_submit_fee_bump(inner_tx_envelope: TransactionEnvelope) -> str:
    """
    Wraps an inner transaction in a Stellar FeeBumpTransaction signed by the Relayer.
    Submits the fee-bumped transaction so the backend pays the XLM gas fee.
    """
    ensure_relayer_funded(relayer_keypair.public_key)

    # 1. Build Fee Bump transaction envelope (relayer pays gas fee)
    fee_bump_envelope = TransactionBuilder.build_fee_bump_transaction(
        fee_source=relayer_keypair.public_key,
        base_fee=500,
        inner_transaction_envelope=inner_tx_envelope,
        network_passphrase=NETWORK_PASSPHRASE,
    )

    # 2. Sign fee-bump transaction with Relayer private key
    fee_bump_envelope.sign(relayer_keypair)

    # 3. Submit transaction to Stellar Testnet
    soroban_server = SorobanServer(SOROBAN_RPC_URL)
    try:
        res = soroban_server.send_transaction(fee_bump_envelope)
        if hasattr(res, "hash") and res.hash:
            return res.hash
        elif hasattr(res, "status") and res.status == "PENDING":
            return getattr(res, "hash", "")
    except Exception as e:
        print(f"Soroban submission warning ({e}), falling back to Horizon submission...")

    horizon_server = Server(HORIZON_URL)
    res = horizon_server.submit_transaction(fee_bump_envelope)
    return res.get("hash") or res.get("id", "")


def sync_distributor_streak_native(user_address: str) -> None:
    """
    Synchronizes user's streak in RewardDistributor contract using native stellar-sdk
    without executing external subprocess CLI commands.
    """
    if not user_address:
        return
    try:
        distributor_id = os.environ.get("DISTRIBUTOR_CONTRACT_ID") or os.environ.get("NEXT_PUBLIC_DISTRIBUTOR_CONTRACT_ID") or "CC42VJLNLOCRSJHX3VXSVR3KOZG2YGFNT6TUEF2DV6TXYS6FGYMESQ3V"
        soroban_server = SorobanServer(SOROBAN_RPC_URL)
        account = soroban_server.load_account(relayer_keypair.public_key)
        
        tx = (
            TransactionBuilder(
                source_account=account,
                network_passphrase=NETWORK_PASSPHRASE,
                base_fee=100,
            )
            .append_invoke_contract_function_op(
                contract_id=distributor_id,
                function_name="set_streak",
                parameters=[
                    relayer_keypair.public_key,
                    user_address,
                    1,
                    int(time.time()),
                ],
            )
            .set_timeout(30)
            .build()
        )
        sim_res = soroban_server.simulate_transaction(tx)
        prepared_tx = soroban_server.prepare_transaction(tx, sim_res)
        prepared_tx.sign(relayer_keypair)
        send_res = soroban_server.send_transaction(prepared_tx)
        print(f"Native distributor streak sync response for {user_address}: {send_res}")
    except Exception as e:
        print(f"Notice: Native distributor streak sync skipped: {e}")


class ProofPayloadRequest(BaseModel):
    user_address: Optional[str] = None
    Sleep_Duration: Optional[float] = 8.0
    Stress_Level: Optional[int] = 2
    Physical_Activity_Level: Optional[int] = 60
    Daily_Steps: Optional[int] = 10000
    Heart_Rate: Optional[int] = 60
    Age: Optional[int] = 28
    Gender: Optional[str] = "Female"
    BMI_Category: Optional[str] = "Normal"
    Sleep_Disorder: Optional[str] = "None"
    Occupation: Optional[str] = "Engineer"
    signed_tx_xdr: Optional[str] = None
    payload_hex: Optional[str] = None
    signature: Optional[str] = None
    timestamp: Optional[int] = None
    contract_id: Optional[str] = None


class SubmitProofRequest(BaseModel):
    signed_tx_xdr: str
    user_address: Optional[str] = None

