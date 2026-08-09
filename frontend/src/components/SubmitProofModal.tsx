"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { submitStreakShard, fetchStreak } from "../utils/stellar";
import Link from "next/link";
import { 
  X, Activity, BrainCircuit, ShieldAlert, CheckCircle, 
  Sparkles, ChevronRight, ChevronLeft, Loader2 
} from "lucide-react";

interface SubmitProofModalProps {
  onSuccess?: () => void;
}

export const SubmitProofModal: React.FC<SubmitProofModalProps> = ({ onSuccess }) => {
  const { publicKey, isConnected, lastSubmissionTimestamp, setLastSubmissionTimestamp } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"metrics" | "demographics" | "subjective">("metrics");

  // Daily Submission Cooldown Logic
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const checkLockAndTimer = () => {
      if (!lastSubmissionTimestamp) {
        setIsLocked(false);
        setTimeLeft("");
        return;
      }
      
      const timestampMs = lastSubmissionTimestamp < 100000000000 ? lastSubmissionTimestamp * 1000 : lastSubmissionTimestamp;
      const lastSubDate = new Date(timestampMs);
      const now = new Date();
      
      const hasSubbedToday = lastSubDate.getFullYear() === now.getFullYear() &&
                             lastSubDate.getMonth() === now.getMonth() &&
                             lastSubDate.getDate() === now.getDate();
      
      setIsLocked(hasSubbedToday);

      if (hasSubbedToday) {
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0); // Sets to 12:00 AM of the next day
        const diffMs = midnight.getTime() - now.getTime();
        
        if (diffMs > 0) {
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
          
          const pad = (num: number) => String(num).padStart(2, "0");
          setTimeLeft(`${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
        } else {
          setTimeLeft("");
          setIsLocked(false);
        }
      } else {
        setTimeLeft("");
      }
    };

    checkLockAndTimer();
    const interval = setInterval(checkLockAndTimer, 1000);
    return () => clearInterval(interval);
  }, [lastSubmissionTimestamp]);
  
  // Workflow progress states
  const [step, setStep] = useState<"idle" | "oracle" | "simulating" | "signing" | "polling" | "success" | "error">("idle");
  const [txHash, setTxHash] = useState<string>("");
  const [predictedScore, setPredictedScore] = useState<number | null>(null);
  const [predictedInterpretation, setPredictedInterpretation] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Form State
  const [formData, setFormData] = useState({
    Sleep_Duration: 7.5,
    Stress_Level: 3,
    Physical_Activity_Level: 45,
    Daily_Steps: 8000,
    Heart_Rate: 65,
    Age: 28,
    Gender: "Male",
    BMI_Category: "Normal",
    Sleep_Disorder: "None",
    Occupation: "Engineer"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNum = ["Sleep_Duration", "Stress_Level", "Physical_Activity_Level", "Daily_Steps", "Heart_Rate", "Age"].includes(name);
    setFormData(prev => ({
      ...prev,
      [name]: isNum ? Number(value) : value
    }));
  };

  const handleNextTab = () => {
    if (activeTab === "metrics") setActiveTab("demographics");
    else if (activeTab === "demographics") setActiveTab("subjective");
  };

  const handlePrevTab = () => {
    if (activeTab === "subjective") setActiveTab("demographics");
    else if (activeTab === "demographics") setActiveTab("metrics");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;

    setStep("oracle");
    setErrorMessage("");

    try {
      // 1. Fetch ML Prediction and Signature from Backend/Oracle
      const getBackendUrl = (): string => {
        const envUrl = process.env.NEXT_PUBLIC_GAS_MASTER_URL || process.env.NEXT_PUBLIC_ORACLE_URL || process.env.NEXT_PUBLIC_ORACLE_API_URL || "";
        const cleaned = envUrl.trim().replace(/\/+$/, "");
        if (!cleaned || cleaned.includes("vercel.app") || cleaned.includes("localhost")) {
          return "https://neurosync-protocol.onrender.com";
        }
        return cleaned;
      };
      const oracleUrl = getBackendUrl();
      const endpoint = `${oracleUrl}/api/generate_signature`;
      console.log(`Attempting to fetch ML prediction from Oracle URL: ${endpoint}`);

      let response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_address: publicKey,
            ...formData
          })
        });
      } catch (networkErr: any) {
        console.error(`Network connectivity error when calling Oracle URL (${endpoint}):`, networkErr);
        throw new Error(`Failed to connect to the sleep validation Oracle at ${oracleUrl}. Please ensure the backend server is running and accessible. Error: ${networkErr?.message || networkErr}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Oracle server error: ${errorText || response.statusText}`);
      }

      const oracleData = await response.json();
      setPredictedScore(oracleData.payload.sleep_score);
      setPredictedInterpretation(oracleData.payload.interpretation);

      // 2. Use deterministic signed payload string returned from Oracle backend to avoid float formatting mismatches
      const payload = oracleData.payload;
      const payloadStr = oracleData.payload_str || JSON.stringify({
        interpretation: payload.interpretation,
        sleep_score: payload.sleep_score,
        timestamp: payload.timestamp,
        user_address: payload.user_address
      });
      console.log("Oracle Signed Payload String:", payloadStr);
      
      // Convert to Hex
      const encoder = new TextEncoder();
      const bytes = encoder.encode(payloadStr);
      const payloadHex = Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      console.log("Converted Payload Hex:", payloadHex);
      
      const signatureHex = oracleData.signature;

      // 3. Submit to Stellar Smart Contract via Freighter
      setStep("simulating");
      const hash = await submitStreakShard(
        publicKey,
        payloadHex,
        signatureHex,
        payload.timestamp,
        oracleData.public_key
      );

      // Save to history in localStorage
      const historyKey = `history_${publicKey}`;
      const existingHistoryStr = localStorage.getItem(historyKey);
      const existingHistory = existingHistoryStr ? JSON.parse(existingHistoryStr) : [];
      const newRecord = {
        timestamp: payload.timestamp,
        sleepDuration: formData.Sleep_Duration,
        stressLevel: formData.Stress_Level,
        physicalActivity: formData.Physical_Activity_Level,
        steps: formData.Daily_Steps,
        heartRate: formData.Heart_Rate,
        sleepScore: oracleData.payload.sleep_score,
        interpretation: oracleData.payload.interpretation,
        signature: oracleData.signature,
        txHash: hash
      };
      existingHistory.unshift(newRecord);
      localStorage.setItem(historyKey, JSON.stringify(existingHistory));
      localStorage.setItem(`history_${publicKey.toLowerCase()}`, JSON.stringify(existingHistory));
      localStorage.setItem("logHistory", JSON.stringify(existingHistory));

      // Refetch on-chain state directly
      try {
        const onChainStreak = await fetchStreak(publicKey);
        if (onChainStreak) {
          localStorage.setItem(`streak_count_${publicKey}`, onChainStreak.count.toString());
        }
      } catch (err) {
        console.warn("Could not refetch on-chain streak after proof submission:", err);
      }

      // Add wallet to the leaderboard array of real submitted wallets
      try {
        const submittedWalletsKey = "neurosync_submitted_wallets";
        const submittedWallets = JSON.parse(localStorage.getItem(submittedWalletsKey) || "[]") as string[];
        if (!submittedWallets.includes(publicKey)) {
          submittedWallets.push(publicKey);
          localStorage.setItem(submittedWalletsKey, JSON.stringify(submittedWallets));
        }
      } catch (err) {
        console.error("Error updating submitted wallets list:", err);
      }

      // Update last submission timestamp in context
      setLastSubmissionTimestamp(payload.timestamp);

      setTxHash(hash);
      setStep("success");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred during sleep proof submission.");
      setStep("error");
    }
  };

  const resetModal = () => {
    setIsOpen(false);
    setStep("idle");
    setTxHash("");
    setPredictedScore(null);
    setPredictedInterpretation("");
    setErrorMessage("");
    setActiveTab("metrics");
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={!isConnected || isLocked}
        className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-[1px] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-shadow"
      >
        <span className="flex items-center justify-center space-x-2 rounded-2xl bg-white dark:bg-slate-900 px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-100 transition-colors group-hover:bg-slate-50/95 dark:group-hover:bg-slate-800/90 border border-slate-100 dark:border-slate-800">
          <BrainCircuit className="h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:rotate-12 transition-transform" />
          <span>{isLocked ? `✓ Proof Submitted Today (${timeLeft})` : "Submit Sleep Proof"}</span>
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-colors duration-300">
            {/* Top border light */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <BrainCircuit className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>Submit Cryptographic Proof</span>
              </h2>
              <button 
                onClick={resetModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6">
              {step === "idle" && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Tab Selector */}
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setActiveTab("metrics")}
                      className={`rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === "metrics" ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Metrics
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("demographics")}
                      className={`rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === "demographics" ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Demographics
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("subjective")}
                      className={`rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === "subjective" ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Subjective
                    </button>
                  </div>

                  {/* Tab Contents */}
                  {activeTab === "metrics" && (
                    <div className="space-y-4">
                      {/* Sleep Duration */}
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                          <span>SLEEP DURATION</span>
                          <span className="text-blue-600 dark:text-blue-400">{formData.Sleep_Duration} hrs</span>
                        </div>
                        <input
                          type="range"
                          name="Sleep_Duration"
                          min="4"
                          max="12"
                          step="0.1"
                          value={formData.Sleep_Duration}
                          onChange={handleChange}
                          className="w-full accent-blue-600"
                        />
                      </div>
                      
                      {/* Physical Activity */}
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                          <span>PHYSICAL ACTIVITY</span>
                          <span className="text-blue-600 dark:text-blue-400">{formData.Physical_Activity_Level} min/day</span>
                        </div>
                        <input
                          type="range"
                          name="Physical_Activity_Level"
                          min="0"
                          max="120"
                          step="5"
                          value={formData.Physical_Activity_Level}
                          onChange={handleChange}
                          className="w-full accent-blue-600"
                        />
                      </div>

                      {/* Daily Steps */}
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                          <span>DAILY STEPS</span>
                          <span className="text-blue-600 dark:text-blue-400">{formData.Daily_Steps.toLocaleString()}</span>
                        </div>
                        <input
                          type="range"
                          name="Daily_Steps"
                          min="1000"
                          max="20000"
                          step="500"
                          value={formData.Daily_Steps}
                          onChange={handleChange}
                          className="w-full accent-blue-600"
                        />
                      </div>

                      {/* Heart Rate */}
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                          <span>HEART RATE</span>
                          <span className="text-blue-600 dark:text-blue-400">{formData.Heart_Rate} BPM</span>
                        </div>
                        <input
                          type="range"
                          name="Heart_Rate"
                          min="50"
                          max="120"
                          step="1"
                          value={formData.Heart_Rate}
                          onChange={handleChange}
                          className="w-full accent-blue-600"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === "demographics" && (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Age */}
                      <div className="col-span-2">
                        <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                          <span>AGE</span>
                          <span className="text-blue-600 dark:text-blue-400">{formData.Age} years</span>
                        </div>
                        <input
                          type="range"
                          name="Age"
                          min="18"
                          max="80"
                          step="1"
                          value={formData.Age}
                          onChange={handleChange}
                          className="w-full accent-blue-600"
                        />
                      </div>

                      {/* Gender */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">GENDER</label>
                        <select
                          name="Gender"
                          value={formData.Gender}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>

                      {/* BMI Category */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">BMI CATEGORY</label>
                        <select
                          name="BMI_Category"
                          value={formData.BMI_Category}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="Normal">Normal</option>
                          <option value="Overweight">Overweight</option>
                          <option value="Obese">Obese</option>
                        </select>
                      </div>

                      {/* Occupation */}
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">OCCUPATION</label>
                        <select
                          name="Occupation"
                          value={formData.Occupation}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="Engineer">Engineer</option>
                          <option value="Scientist">Scientist</option>
                          <option value="Teacher">Teacher</option>
                          <option value="Nurse">Nurse</option>
                          <option value="Salesperson">Salesperson</option>
                          <option value="Doctor">Doctor</option>
                          <option value="Manager">Manager</option>
                          <option value="Accountant">Accountant</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {activeTab === "subjective" && (
                    <div className="space-y-4">
                      {/* Stress Level */}
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                          <span>STRESS LEVEL</span>
                          <span className="text-blue-600 dark:text-blue-400">{formData.Stress_Level} / 10</span>
                        </div>
                        <input
                          type="range"
                          name="Stress_Level"
                          min="1"
                          max="10"
                          step="1"
                          value={formData.Stress_Level}
                          onChange={handleChange}
                          className="w-full accent-blue-600"
                        />
                      </div>

                      {/* Sleep Disorder */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">SLEEP DISORDER</label>
                        <select
                          name="Sleep_Disorder"
                          value={formData.Sleep_Disorder}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="None">None</option>
                          <option value="Insomnia">Insomnia</option>
                          <option value="Sleep Apnea">Sleep Apnea</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    {activeTab !== "metrics" ? (
                      <button
                        type="button"
                        onClick={handlePrevTab}
                        className="flex items-center space-x-1 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Back</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    {activeTab !== "subjective" ? (
                      <button
                        type="button"
                        onClick={handleNextTab}
                        className="flex items-center space-x-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer"
                      >
                        <span>Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isLocked}
                        className="rounded-xl bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                      >
                        {isLocked ? "Daily Limit Reached" : "Generate & Submit"}
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* Progress Steps */}
              {["oracle", "simulating", "signing", "polling"].includes(step) && (
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                    <div className="absolute -inset-1 rounded-full bg-blue-500/5 blur-[10px] animate-pulse" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-md font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      {step === "oracle" && "Invoking ML Oracle..."}
                      {step === "simulating" && "Simulating Proof Transaction..."}
                      {step === "signing" && "Awaiting Freighter Signature..."}
                      {step === "polling" && "Indexing On-Chain State..."}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">
                      {step === "oracle" && "Evaluating sleep metrics against pre-trained ML classifier pipeline and producing signature."}
                      {step === "simulating" && "Calculating resource footprints and contract execution fees on Stellar Testnet."}
                      {step === "signing" && "Sign the transaction envelope inside the Freighter browser wallet pop-up."}
                      {step === "polling" && "Transaction submitted. Awaiting validator validation and state write finality."}
                    </p>
                  </div>
                </div>
              )}

              {/* Success Screen */}
              {step === "success" && (() => {
                const overallScore = predictedScore !== null ? Math.round(predictedScore * 10) : 0;
                const deepSleepEst = Math.max(5, Math.min(30, Math.round(20 - (formData.Stress_Level * 0.8) + (formData.Sleep_Duration * 0.5))));
                const hrvEst = Math.max(20, Math.min(150, Math.round(80 - (formData.Stress_Level * 5.0) + (formData.Physical_Activity_Level * 0.3))));
                
                let highlightAlert = "✨ Optimal autonomic parasympathetic recovery balance";
                let highlightBg = "bg-emerald-50 dark:bg-emerald-955/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/50";
                if (deepSleepEst < 15) {
                  highlightAlert = "⚡ Deep sleep below target baseline";
                  highlightBg = "bg-amber-50 dark:bg-amber-955/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50";
                } else if (formData.Stress_Level > 6) {
                  highlightAlert = "⚠️ High stress index detected during sleep cycle";
                  highlightBg = "bg-amber-50 dark:bg-amber-955/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50";
                } else if (formData.Heart_Rate > 70) {
                  highlightAlert = "❤️ Elevated resting heart rate detected";
                  highlightBg = "bg-rose-50 dark:bg-rose-955/40 text-rose-600 dark:text-rose-455 border border-rose-200/50 dark:border-rose-900/50";
                }

                return (
                  <div className="flex flex-col items-center justify-center py-6 space-y-6 text-center">
                    <div className="h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-955/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 relative shadow-sm">
                      <CheckCircle className="h-8 w-8 animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Proof Cryptographically Synced!</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto">
                        The ML-generated evaluation was verified by the Soroban smart contract, and your sleep habit streak is updated on-chain.
                      </p>
                    </div>

                    {/* Quick Summary Card */}
                    <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5 text-left space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telemetry Summary</span>
                        <span className="text-2xl font-black text-indigo-650 dark:text-indigo-400 font-mono">
                          {overallScore}<span className="text-xs font-semibold text-slate-405">/100</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div className="p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950">
                          <span className="text-slate-400 block text-[9px] uppercase">Duration</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{formData.Sleep_Duration} hrs</span>
                        </div>
                        <div className="p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-955">
                          <span className="text-slate-400 block text-[9px] uppercase">Resting HR</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{formData.Heart_Rate} BPM</span>
                        </div>
                        <div className="p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950">
                          <span className="text-slate-400 block text-[9px] uppercase">Est. Deep Sleep</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{deepSleepEst}%</span>
                        </div>
                        <div className="p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-955">
                          <span className="text-slate-400 block text-[9px] uppercase">Est. HRV</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{hrvEst} ms</span>
                        </div>
                      </div>

                      {/* Primary Highlight Alert */}
                      <div className={`p-3 rounded-xl text-xs font-semibold ${highlightBg} flex items-center space-x-2`}>
                        <span>{highlightAlert}</span>
                      </div>
                    </div>

                    {/* Analytics CTA */}
                    <Link
                      href="/analytics"
                      onClick={resetModal}
                      className="w-full py-3.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold transition-all text-xs shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <span>View Full Neuroscience Insights & Protocol →</span>
                    </Link>

                    <div className="w-full space-y-1.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 p-3.5 text-left font-mono text-[10px] text-slate-500">
                      <div className="flex justify-between">
                        <span>CONTRACT:</span>
                        <span className="text-slate-700 dark:text-slate-350">{process.env.NEXT_PUBLIC_CONTRACT_ID?.slice(0, 14)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TX HASH:</span>
                        <a 
                          href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                          target="_blank" 
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline font-bold"
                        >
                          {txHash.slice(0, 14)}...
                        </a>
                      </div>
                    </div>

                    <button
                      onClick={resetModal}
                      className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-505 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                );
              })()}

              {/* Error Screen */}
              {step === "error" && (
                <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 shadow-sm">
                    <ShieldAlert className="h-9 w-9" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Cryptographic Verification Failed</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
                      Could not write the sleep proof to the Stellar network due to validation issues.
                    </p>
                  </div>
                  <div className="w-full max-h-32 overflow-y-auto rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900/50 p-4 text-left font-mono text-xs text-red-600 dark:text-red-450">
                    {errorMessage}
                  </div>
                  <div className="flex w-full space-x-3">
                    <button
                      onClick={() => setStep("idle")}
                      className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm shadow-sm cursor-pointer"
                    >
                      Modify Parameters
                    </button>
                    <button
                      onClick={resetModal}
                      className="flex-1 py-3 rounded-xl bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-300 font-semibold hover:bg-red-200 dark:hover:bg-red-800 transition-colors text-sm shadow-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
