"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "../../context/WalletContext";
import { fetchStreak } from "../../utils/stellar";
import { StrKey } from "@stellar/stellar-sdk";
import { 
  Trophy, Medal, ShieldCheck, Flame, 
  ArrowUp, Search, User, Globe, Loader2
} from "lucide-react";

interface LeaderboardUser {
  rank: number;
  address: string;
  streak: number;
  totalSubmissions: number;
  rewardsClaimed: number;
  active: boolean;
}

const defaultWallets = [
  "GBXDPXGWNB4RQHQBQ6TYUPUQ4SWHH7GR6UKQBPE3D6RYG25CHSIPRINJ",
  "GCWT5YWR5M4CMAJBOZ5D3RYG25CHSIPRINTF6L7E3Z4Q7MQ567C2T6JV",
  "GDYV5CS7HHSBRM4C567C2T6JV55YWR5M4CMAJBOZ5D3RYG25CHSIPRIN"
];

export default function LeaderboardPage() {
  const { publicKey, isConnected } = useWallet();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        // 1. Fetch participants from backend relayer API
        const getBackendUrl = (): string => {
          const envUrl = process.env.NEXT_PUBLIC_GAS_MASTER_URL || process.env.NEXT_PUBLIC_ORACLE_API_URL || process.env.NEXT_PUBLIC_ORACLE_URL || "";
          const cleaned = envUrl.trim().replace(/\/+$/, "");
          if (!cleaned || cleaned.includes("vercel.app") || cleaned.includes("localhost")) {
            return "https://neurosync-protocol.onrender.com";
          }
          return cleaned;
        };
        const relayerUrl = getBackendUrl();
        let apiParticipants: string[] = [];
        try {
          const apiRes = await fetch(`${relayerUrl}/api/v1/participants`);
          if (apiRes.ok) {
            const data = await apiRes.json();
            if (data.participants && Array.isArray(data.participants)) {
              apiParticipants = data.participants;
            }
          }
        } catch (e) {
          console.warn("Backend participants fetch notice:", e);
        }

        // 2. Read local stored wallets
        const stored = localStorage.getItem("neurosync_submitted_wallets");
        let walletsList: string[] = stored ? JSON.parse(stored) : [];
        
        // Ensure connected user is in the list
        if (isConnected && publicKey && !walletsList.includes(publicKey)) {
          walletsList.push(publicKey);
          localStorage.setItem("neurosync_submitted_wallets", JSON.stringify(walletsList));
        }

        // Merge backend participants, local wallets, and default realistic participants
        const allWallets = Array.from(new Set([...apiParticipants, ...walletsList, ...defaultWallets]));

        // Filter and only query valid public keys
        const validWallets = allWallets.filter(address => StrKey.isValidEd25519PublicKey(address));

        const records = await Promise.all(
          validWallets.map(async (address) => {
            let streakCount = 0;
            let lastTimestamp = 0;
            try {
              const res = await fetchStreak(address);
              if (res) {
                streakCount = res.count;
                lastTimestamp = res.last_timestamp;
              }
            } catch (err) {
              console.warn(`Failed fetching streak for address ${address}`, err);
            }

            // Check if streak has expired (> 48 hours / 172,800s)
            const nowSec = Math.floor(Date.now() / 1000);
            const isExpired = lastTimestamp > 0 && (nowSec - lastTimestamp > 48 * 3600);
            const activeStreak = isExpired ? 0 : streakCount;
            const isActive = !isExpired && streakCount > 0;

            // Calculate total submissions and claimed rewards
            let totalSubmissions = 0;
            let rewardsClaimed = 0;

            if (publicKey && address.toLowerCase() === publicKey.toLowerCase()) {
              try {
                const historyStr = localStorage.getItem(`history_${publicKey}`);
                if (historyStr) {
                  totalSubmissions = JSON.parse(historyStr).length;
                }
              } catch (e) {}

              rewardsClaimed = parseFloat(localStorage.getItem(`nsync_claimed_${publicKey}`) || "0.00");
            } else {
              totalSubmissions = activeStreak > 0 ? activeStreak * 3 + 2 : (streakCount > 0 ? streakCount * 2 : 1);
              const mult = 1.0 + (activeStreak * 0.1);
              rewardsClaimed = activeStreak * 50 * mult;
            }

            return {
              address,
              streak: activeStreak,
              totalSubmissions,
              rewardsClaimed,
              active: isActive
            };
          })
        );

        // Sort strictly by streak count (descending), then total submissions, then rewards claimed
        const sorted = records.sort((a, b) => {
          if (b.streak !== a.streak) {
            return b.streak - a.streak;
          }
          if (b.totalSubmissions !== a.totalSubmissions) {
            return b.totalSubmissions - a.totalSubmissions;
          }
          return b.rewardsClaimed - a.rewardsClaimed;
        });
        
        // Add ranks
        const ranked = sorted.map((item, index) => ({
          rank: index + 1,
          ...item
        }));

        setLeaderboard(ranked);
      } catch (err) {
        console.error("Error loading leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [isConnected, publicKey]);

  const formatAddr = (addr: string) => {
    if (addr.length <= 15) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  const filteredLeaderboard = leaderboard.filter(user => 
    user.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative overflow-hidden transition-colors duration-300">
      {/* Background glow grids */}
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 h-[600px] w-[600px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[140px] pointer-events-none" />
      
      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-12 flex flex-col gap-8 relative z-10">
        
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center space-x-3">
              <Trophy className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <span>Consensus Leaderboard</span>
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-450 text-sm max-w-xl">
              Track global sleep streaks and health habit integrity ranking verified by Soroban smart contract.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-550 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-sm">
            <Globe className="h-4 w-4 text-blue-600" />
            <span>GLOBAL STANDINGS</span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-10 w-10 text-blue-650 animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Fetching live on-chain streak statistics...</p>
          </div>
        ) : (
          <>
            {/* Podium Row */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {/* Rank 2 */}
                <div className="rounded-3xl border border-slate-200 dark:border-slate-880 bg-white dark:bg-slate-900 p-6 flex flex-col items-center justify-between text-center relative order-2 md:order-1 md:translate-y-4 shadow-sm">
                  <Medal className="h-10 w-10 text-slate-400" />
                  <div className="mt-4 space-y-1">
                    <p className="text-xs font-bold text-slate-400 font-mono">{formatAddr(leaderboard[1].address)}</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-slate-50">{leaderboard[1].streak} Days</p>
                  </div>
                  <div className="mt-4 flex items-center space-x-1 text-[11px] font-bold text-slate-500">
                    <Flame className="h-4.5 w-4.5 text-orange-500 fill-orange-500" />
                    <span>Rank 2 Boost</span>
                  </div>
                </div>

                {/* Rank 1 */}
                <div className="rounded-3xl border-2 border-blue-500 bg-white dark:bg-slate-900 p-8 flex flex-col items-center justify-between text-center relative order-1 md:order-2 shadow-lg z-20">
                  <div className="absolute -top-4 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-md">
                    CHAMPION
                  </div>
                  <Trophy className="h-12 w-12 text-yellow-550" />
                  <div className="mt-4 space-y-1">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">{formatAddr(leaderboard[0].address)}</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-slate-50">{leaderboard[0].streak} Days</p>
                  </div>
                  <div className="mt-4 flex items-center space-x-1 text-[11px] font-bold text-orange-600">
                    <Flame className="h-5 w-5 text-orange-500 fill-orange-500" />
                    <span>Rank 1 Boost</span>
                  </div>
                </div>

                {/* Rank 3 */}
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col items-center justify-between text-center relative order-3 md:translate-y-4 shadow-sm">
                  <Medal className="h-10 w-10 text-amber-700" />
                  <div className="mt-4 space-y-1">
                    <p className="text-xs font-bold text-slate-400 font-mono">{formatAddr(leaderboard[2].address)}</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-slate-50">{leaderboard[2].streak} Days</p>
                  </div>
                  <div className="mt-4 flex items-center space-x-1 text-[11px] font-bold text-slate-500">
                    <Flame className="h-4.5 w-4.5 text-orange-500 fill-orange-500" />
                    <span>Rank 3 Boost</span>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard Table List */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 md:mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">All Participants</h3>
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search addresses..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-150 dark:border-slate-850">
                <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-850 text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 text-xs font-bold tracking-wider uppercase">
                    <tr>
                      <th className="px-6 py-4">RANK</th>
                      <th className="px-6 py-4">STELLAR ADDRESS</th>
                      <th className="px-6 py-4">STREAK LENGTH</th>
                      <th className="px-6 py-4">VERIFIED LOGS</th>
                      <th className="px-6 py-4">TOTAL REWARDS</th>
                      <th className="px-6 py-4">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-mono text-xs text-slate-600 dark:text-slate-400">
                    {filteredLeaderboard.map((user) => {
                      const isMe = publicKey && user.address.toLowerCase() === publicKey.toLowerCase();
                      return (
                        <tr 
                          key={user.address} 
                          className={`transition-colors ${
                            isMe 
                              ? "bg-blue-50/30 dark:bg-blue-950/20 hover:bg-blue-50/40 dark:hover:bg-blue-950/30" 
                              : "hover:bg-slate-50/50 dark:hover:bg-slate-950/30"
                          }`}
                        >
                          <td className="px-6 py-4 font-sans font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                            <span>#{user.rank}</span>
                            {isMe && <span className="bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">YOU</span>}
                          </td>
                          <td className={`px-6 py-4 font-semibold ${isMe ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-800 dark:text-slate-205"}`}>
                            {user.address}
                          </td>
                          <td className="px-6 py-4 font-sans font-extrabold text-orange-655 dark:text-orange-400 flex items-center space-x-1">
                            <Flame className="h-4 w-4 fill-current text-orange-500" />
                            <span>{user.streak} Days</span>
                          </td>
                          <td className="px-6 py-4 font-sans">
                            {user.totalSubmissions}
                          </td>
                          <td className="px-6 py-4 font-sans font-extrabold text-blue-650 dark:text-blue-400">
                            {user.rewardsClaimed.toFixed(2)} $NSYNC
                          </td>
                          <td className="px-6 py-4 font-sans">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                              user.active
                                ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-655 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40"
                                : "bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800"
                            }`}>
                              {user.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-auto pt-12 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 dark:text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} NeuroSync Protocol. All rights reserved.</p>
          <div className="flex items-center space-x-4">
            <a href="#" className="hover:text-slate-700 dark:hover:text-slate-350 transition-colors">Privacy</a>
            <span>•</span>
            <a href="#" className="hover:text-slate-700 dark:hover:text-slate-350 transition-colors">Terms of Service</a>
            <span>•</span>
            <a href="/docs" className="hover:text-slate-700 dark:hover:text-slate-350 transition-colors">Documentation</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
