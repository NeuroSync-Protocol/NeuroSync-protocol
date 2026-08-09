import {
  rpc,
  Contract,
  Address,
  TransactionBuilder,
  Account,
  scValToNative,
  nativeToScVal,
  xdr,
  StrKey,
} from "@stellar/stellar-sdk";
import freighterApi from "@stellar/freighter-api";
import { Buffer } from "buffer";

const { signTransaction } = freighterApi;

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org:443";
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "CDJ47A6P6PWCG7ZQYO3BNEQ6FLFOTSRRENEH2V5TVXDBEET7YBL4JNWG";
const DISTRIBUTOR_CONTRACT_ID = process.env.NEXT_PUBLIC_DISTRIBUTOR_CONTRACT_ID || process.env.NEXT_PUBLIC_REWARD_DISTRIBUTOR_CONTRACT_ID || "CC42VJLNLOCRSJHX3VXSVR3KOZG2YGFNT6TUEF2DV6TXYS6FGYMESQ3V";
const getBackendUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_GAS_MASTER_URL || process.env.NEXT_PUBLIC_ORACLE_API_URL || process.env.NEXT_PUBLIC_ORACLE_URL || "";
  const cleaned = envUrl.trim().replace(/\/+$/, "");
  if (!cleaned || cleaned.includes("vercel.app") || cleaned.includes("localhost")) {
    return "https://neurosync-protocol.onrender.com";
  }
  return cleaned;
};

const BASE_RELAYER_URL = getBackendUrl();
const GAS_MASTER_URL = `${BASE_RELAYER_URL}/api/v1/submit-proof`;

const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

const server = new rpc.Server(RPC_URL);
const streakContract = new Contract(CONTRACT_ID);
const distributorContract = new Contract(DISTRIBUTOR_CONTRACT_ID);

/**
 * Queries the contract state for the user's active streak.
 */
export async function fetchStreak(
  userAddress: string
): Promise<{ count: number; last_timestamp: number } | null> {
  if (!userAddress || typeof userAddress !== "string" || !StrKey.isValidEd25519PublicKey(userAddress)) {
    console.warn(`Invalid userAddress provided to fetchStreak: ${userAddress}`);
    return null;
  }
  try {
    const parsedAddress = Address.fromString(userAddress);
    const dummyAccount = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    const tx = new TransactionBuilder(dummyAccount, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        streakContract.call(
          "get_streak",
          nativeToScVal(parsedAddress)
        )
      )
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
      const scVal = sim.result.retval;
      const native = scValToNative(scVal);
      if (!native) return null;
      return {
        count: Number(native.count),
        last_timestamp: Number(native.last_timestamp),
      };
    }
  } catch (err) {
    console.error("Error in fetchStreak:", err);
    return null;
  }
  return null;
}

/**
 * Submits a signed sleep quality shard to the smart contract via FastAPI Gas Master backend.
 * Uses Freighter for user authorization signature, and routes through Gas Master FeeBump for ZERO-GAS settlement.
 */
export async function submitStreakShard(
  userAddress: string,
  payloadHex: string,
  signatureHex: string,
  currentTimestamp: number,
  oraclePublicKey?: string
): Promise<string> {
  try {
    let signRes: any = null;

    try {
      // 1. Get the sequence number from RPC node
      const accountInfo = await server.getAccount(userAddress);
      const account = new Account(userAddress, accountInfo.sequenceNumber());

      // 2. Format parameters for submit_shard function call
      const userVal = nativeToScVal(Address.fromString(userAddress));
      const rawMessageBytes = Buffer.from(payloadHex, "hex");
      const payloadVal = xdr.ScVal.scvBytes(rawMessageBytes);

      const rawSigBytes = Buffer.from(signatureHex, "hex");
      if (rawSigBytes.length !== 64) {
        throw new Error(`Invalid signature length: expected 64 bytes, got ${rawSigBytes.length}`);
      }
      const signatureVal = xdr.ScVal.scvBytes(rawSigBytes);

      // 3. Build preliminary transaction
      const tx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          streakContract.call(
            "submit_shard",
            userVal,
            payloadVal,
            signatureVal
          )
        )
        .setTimeout(60)
        .build();

      // 4. Simulate & Prepare Transaction
      const preparedTx = await server.prepareTransaction(tx);

      // 5. Convert to Base64 XDR for Freighter user signature
      const txXdr = preparedTx.toEnvelope().toXDR("base64");
      signRes = await signTransaction(txXdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address: userAddress,
      });

      if (signRes.error) {
        throw new Error(`Freighter signing rejected: ${signRes.error}`);
      }
    } catch (rpcOrSignErr: any) {
      console.warn(`RPC lookup/signing notice for ${userAddress} (${rpcOrSignErr?.message || rpcOrSignErr}). Routing via Gas Master backend sponsorship...`);
    }

    // 6. Send transaction to Gas Master Relayer backend for FeeBump submission & zero-gas settlement
    console.log(`Submitting sleep proof to Gas Master Relayer endpoint: ${GAS_MASTER_URL}`);
    const relayerRes = await fetch(GAS_MASTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_address: userAddress,
        signed_tx_xdr: signRes?.signedTxXdr || undefined,
        signature: signatureHex
      }),
    });

    if (!relayerRes.ok) {
      const errText = await relayerRes.text();
      throw new Error(`Gas Master Relayer error (${relayerRes.status}): ${errText}`);
    }

    const relayerData = await relayerRes.json();
    console.log("Gas Master Relayer response:", relayerData);

    if (relayerData.status === "error") {
      throw new Error(relayerData.message || "Gas Master relay failed.");
    }

    if (relayerData.tx_hash) {
      return relayerData.tx_hash;
    }

    return relayerData.hash || "0x_gas_master_relayed_tx";
  } catch (err) {
    console.error("Error in submitStreakShard via Gas Master:", err);
    throw err;
  }
}

/**
 * Queries the contract state for the user's unclaimed token allocation.
 */
export async function fetchUnclaimedAllocation(
  userAddress: string
): Promise<number> {
  if (!userAddress || typeof userAddress !== "string" || !StrKey.isValidEd25519PublicKey(userAddress)) {
    return 0;
  }

  // 1. Check if user has already claimed today
  try {
    const hasClaimed = await fetchHasClaimedToday(userAddress);
    if (hasClaimed) {
      return 0;
    }
  } catch (err) {
    console.warn("Error checking has_claimed_today:", err);
  }

  // 2. Query distributor contract for on-chain unclaimed allocation
  try {
    const parsedAddress = Address.fromString(userAddress);
    const dummyAccount = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    const tx = new TransactionBuilder(dummyAccount, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        distributorContract.call(
          "unclaimed_allocation",
          nativeToScVal(parsedAddress)
        )
      )
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
      const scVal = sim.result.retval;
      const native = scValToNative(scVal);
      const val = Number(native) / 10_000_000;
      if (val > 0) return val;
    }
  } catch (err) {
    console.warn("Error fetching unclaimed_allocation from distributor contract:", err);
  }

  // 3. Fallback: check active streak and calculate 50 + (streak * 5)
  try {
    const streak = await fetchStreak(userAddress);
    if (streak && streak.count > 0) {
      return 50 + (streak.count * 5);
    }
  } catch (err) {
    console.error("Error in fallback unclaimed allocation calculation:", err);
  }

  return 0;
}

/**
 * Queries the Reward Distributor contract state to check if user has claimed today.
 */
export async function fetchHasClaimedToday(
  userAddress: string
): Promise<boolean> {
  if (!userAddress || typeof userAddress !== "string" || !StrKey.isValidEd25519PublicKey(userAddress)) {
    return false;
  }
  try {
    const parsedAddress = Address.fromString(userAddress);
    const dummyAccount = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    const tx = new TransactionBuilder(dummyAccount, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        distributorContract.call(
          "has_claimed_today",
          nativeToScVal(parsedAddress)
        )
      )
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
      const scVal = sim.result.retval;
      const native = scValToNative(scVal);
      return Boolean(native);
    }
  } catch (err) {
    console.warn("Error checking has_claimed_today on contract:", err);
  }
  return false;
}

/**
 * Queries the contract state for the full user state (unclaimed allocation, last claim timestamp).
 */
export async function fetchUserState(
  userAddress: string
): Promise<{ unclaimed_allocation: number; last_claim_timestamp: number } | null> {
  if (!userAddress || typeof userAddress !== "string" || !StrKey.isValidEd25519PublicKey(userAddress)) {
    return null;
  }
  try {
    const parsedAddress = Address.fromString(userAddress);
    const dummyAccount = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    const tx = new TransactionBuilder(dummyAccount, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        distributorContract.call(
          "get_user_state",
          nativeToScVal(parsedAddress)
        )
      )
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
      const scVal = sim.result.retval;
      const native = scValToNative(scVal);
      if (native) {
        return {
          unclaimed_allocation: Number(native.unclaimed_allocation) / 10_000_000,
          last_claim_timestamp: Number(native.last_claim_timestamp),
        };
      }
    }
  } catch (err) {
    console.warn("Contract get_user_state query fallback:", err);
  }

  try {
    const unclaimed = await fetchUnclaimedAllocation(userAddress);
    const lastClaimTimestamp = parseFloat(localStorage.getItem(`nsync_last_claim_timestamp_${userAddress}`) || "0");
    return {
      unclaimed_allocation: unclaimed,
      last_claim_timestamp: lastClaimTimestamp,
    };
  } catch (err) {
    console.error("Error in fallback fetchUserState:", err);
  }
  return null;
}

/**
 * Executes reward claim transaction on Reward Distributor contract via Gas Master Relayer backend.
 */
export async function claimRewardGasMaster(
  userAddress: string
): Promise<string> {
  try {
    const accountInfo = await server.getAccount(userAddress);
    const account = new Account(userAddress, accountInfo.sequenceNumber());
    const userVal = nativeToScVal(Address.fromString(userAddress));

    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        distributorContract.call(
          "claim_reward",
          userVal
        )
      )
      .setTimeout(60)
      .build();

    const preparedTx = await server.prepareTransaction(tx);
    const txXdr = preparedTx.toEnvelope().toXDR("base64");

    const signRes = await signTransaction(txXdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
      address: userAddress,
    });

    if (signRes.error) {
      throw new Error(`Freighter signing rejected: ${signRes.error}`);
    }

    // Submit to Gas Master Relayer
    const relayerRes = await fetch(GAS_MASTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signed_tx_xdr: signRes.signedTxXdr
      }),
    });

    if (!relayerRes.ok) {
      const errText = await relayerRes.text();
      throw new Error(`Gas Master Relayer claim error (${relayerRes.status}): ${errText}`);
    }

    const relayerData = await relayerRes.json();
    if (relayerData.status === "error") {
      throw new Error(relayerData.message || "Reward claim relay failed.");
    }

    return relayerData.tx_hash || "0x_gas_master_claim_tx";
  } catch (err) {
    console.error("Error in claimRewardGasMaster:", err);
    throw err;
  }
}
