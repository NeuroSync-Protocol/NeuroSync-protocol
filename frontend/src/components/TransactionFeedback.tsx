"use client";

import React from "react";
import { AlertCircle, CheckCircle, Info, X, Loader2 } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "loading";
  title: string;
  description?: string;
  txHash?: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full px-4 sm:px-0 pointer-events-none">
      {toasts.map((toast) => {
        const isError = toast.type === "error";
        const isSuccess = toast.type === "success";
        const isLoading = toast.type === "loading";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 ${
              isError
                ? "bg-rose-50/95 dark:bg-rose-950/90 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-100"
                : isSuccess
                ? "bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-100"
                : isLoading
                ? "bg-blue-50/95 dark:bg-blue-950/90 border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-100"
                : "bg-white/95 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {isError && <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
                {isSuccess && <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
                {isLoading && <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />}
                {!isError && !isSuccess && !isLoading && (
                  <Info className="h-5 w-5 text-slate-500" />
                )}
              </div>

              <div className="flex-1 space-y-1">
                <p className="text-xs font-bold">{toast.title}</p>
                {toast.description && (
                  <p className="text-[11px] opacity-80 leading-relaxed font-sans">{toast.description}</p>
                )}
                {toast.txHash && (
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${toast.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-[10px] font-mono underline font-bold mt-1 text-blue-600 dark:text-blue-400"
                  >
                    View on Stellar Expert ({toast.txHash.slice(0, 8)}...) ↗
                  </a>
                )}
              </div>

              <button
                onClick={() => onDismiss(toast.id)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const ClaimTransactionSkeleton: React.FC = () => {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
      </div>
      <div className="space-y-2 py-4">
        <div className="h-10 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-3 w-48 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
      </div>
      <div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
    </div>
  );
};
