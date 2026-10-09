"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { isConnected as checkFreighter, requestAccess, getNetwork } from "@stellar/freighter-api";
import { Horizon } from "@stellar/stellar-sdk";
import { fetchStreak } from "../utils/stellar";

interface WalletContextType {
  publicKey: string | null;
  balance: string | null;
  hasFreighter: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: (pubKey?: string | null) => Promise<void>;
  network: string | null;
  error: string | null;
  lastSubmissionTimestamp: number | null;
  setLastSubmissionTimestamp: (t: number | null) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [hasFreighter, setHasFreighter] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [network, setNetwork] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSubmissionTimestamp, _setLastSubmissionTimestamp] = useState<number | null>(null);

  // Auto-reconnect check on mount from localStorage
  useEffect(() => {
    const initWallet = async () => {
      if (typeof window === "undefined") return;
      try {
        const res = await checkFreighter();
        setHasFreighter(!!res.isConnected);

        const savedConnected = localStorage.getItem("neurosync_wallet_connected");
        const savedPubKey = localStorage.getItem("neurosync_wallet_pubkey");

        if (savedConnected === "true" && savedPubKey) {
          setPublicKey(savedPubKey);
          setIsConnected(true);
          refreshBalance(savedPubKey);
        }
      } catch (err) {
        console.error("Error during wallet initialization:", err);
      }
    };
    initWallet();
  }, []);

  // Sync state if already saved in localStorage for this wallet
  useEffect(() => {
    if (publicKey) {
      const cached = localStorage.getItem(`last_sub_${publicKey}`);
      if (cached) {
        _setLastSubmissionTimestamp(parseInt(cached, 10));
      }
      fetchStreak(publicKey).then((data) => {
        if (data && data.last_timestamp > 0) {
          _setLastSubmissionTimestamp(data.last_timestamp);
          localStorage.setItem(`last_sub_${publicKey}`, String(data.last_timestamp));
        }
      }).catch((err) => console.error("Error checking streak on load:", err));
    }
  }, [publicKey]);

  const setLastSubmissionTimestamp = (t: number | null) => {
    _setLastSubmissionTimestamp(t);
    if (publicKey) {
      if (t) {
        localStorage.setItem(`last_sub_${publicKey}`, String(t));
      } else {
        localStorage.removeItem(`last_sub_${publicKey}`);
      }
    }
  };

  const refreshBalance = async (pubKey = publicKey) => {
    if (!pubKey) return;
    try {
      const server = new Horizon.Server("https://horizon-testnet.stellar.org");
      const account = await server.loadAccount(pubKey);
      const nativeBalance = account.balances.find((b) => b.asset_type === "native");
      setBalance(nativeBalance ? parseFloat(nativeBalance.balance).toFixed(2) : "0.00");
    } catch (err) {
      console.error("Error fetching native XLM balance:", err);
      setBalance("0.00");
    }
  };

  const connectWallet = async () => {
    if (typeof window === "undefined") return;
    if (isConnecting) return;
    setIsConnecting(true);
    setError(null);
    try {
      const res = await checkFreighter();
      if (!res.isConnected) {
        setHasFreighter(false);
        const errMsg = "Freighter Wallet is not installed. Please install it from freighter.app to connect.";
        setError(errMsg);
        setIsConnected(false);
        return;
      }
      setHasFreighter(true);

      const accessRes = await requestAccess();
      if (accessRes.error) {
        throw new Error(accessRes.error);
      }

      const pubKey = accessRes.address;
      if (!pubKey) {
        throw new Error("No public key retrieved from Freighter wallet.");
      }

      const networkRes = await getNetwork();
      let activeNetwork = networkRes.network || null;
      setNetwork(activeNetwork);

      setPublicKey(pubKey);
      setIsConnected(true);
      setError(null);

      // Persist wallet context in localStorage
      localStorage.setItem("neurosync_wallet_connected", "true");
      localStorage.setItem("neurosync_wallet_pubkey", pubKey);

      await refreshBalance(pubKey);

      try {
        const data = await fetchStreak(pubKey);
        if (data && data.last_timestamp > 0) {
          _setLastSubmissionTimestamp(data.last_timestamp);
          localStorage.setItem(`last_sub_${pubKey}`, String(data.last_timestamp));
        }
      } catch (err) {
        console.error("Error loading streak on connect:", err);
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.error("Failed to connect Freighter wallet:", err);
      setError(errMsg);
      setIsConnected(false);
      setPublicKey(null);
      localStorage.removeItem("neurosync_wallet_connected");
      localStorage.removeItem("neurosync_wallet_pubkey");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setPublicKey(null);
    setBalance(null);
    setIsConnected(false);
    setNetwork(null);
    setError(null);
    _setLastSubmissionTimestamp(null);
    localStorage.removeItem("neurosync_wallet_connected");
    localStorage.removeItem("neurosync_wallet_pubkey");
  };

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        balance,
        hasFreighter,
        isConnected,
        isConnecting,
        connectWallet,
        connect: connectWallet,
        disconnect,
        refreshBalance,
        network,
        error,
        lastSubmissionTimestamp,
        setLastSubmissionTimestamp,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

// Auto-reconnect and session persistence helper
export const checkFreighterSession = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem('neurosync_wallet_connected'));
};
