'use client';

import React from 'react';
import { ClaimToastNotification } from '@/types/telemetry';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, ExternalLink } from 'lucide-react';

interface ClaimToastContainerProps {
  toasts: ClaimToastNotification[];
  onDismiss: (id: string) => void;
}

export const ClaimToastContainer: React.FC<ClaimToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const getToastStyles = () => {
          switch (toast.type) {
            case 'success':
              return {
                bg: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200',
                icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
              };
            case 'error':
              return {
                bg: 'bg-rose-950/90 border-rose-500/40 text-rose-200',
                icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
              };
            case 'warning':
              return {
                bg: 'bg-amber-950/90 border-amber-500/40 text-amber-200',
                icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
              };
            default:
              return {
                bg: 'bg-indigo-950/90 border-indigo-500/40 text-indigo-200',
                icon: <Info className="w-5 h-5 text-indigo-400 shrink-0" />,
              };
          }
        };

        const styles = getToastStyles();

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all animate-in slide-in-from-bottom-2 ${styles.bg}`}
          >
            {styles.icon}
            <div className="flex-1 text-xs">
              <h4 className="font-bold text-white mb-0.5">{toast.title}</h4>
              <p className="text-slate-300 leading-relaxed">{toast.message}</p>
              {toast.txHash && (
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${toast.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 mt-2 underline"
                >
                  View on Stellar Expert <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ClaimToastContainer;
