'use client';

import React from 'react';
import { TelemetryProofMetadata } from '@/types/telemetry';
import { ShieldCheck, CheckCircle2, Copy, ExternalLink, X, FileCode } from 'lucide-react';

interface ProofDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: TelemetryProofMetadata | null;
}

export const ProofDetailModal: React.FC<ProofDetailModalProps> = ({
  isOpen,
  onClose,
  metadata,
}) => {
  if (!isOpen || !metadata) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/50 hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Cryptographic Proof Audit</h3>
            <p className="text-xs text-slate-400">Zero-Knowledge biometric telemetry verification</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 font-medium">Proof Payload Hash (SHA-256)</div>
            <div className="font-mono text-indigo-300 break-all">{metadata.proofHash}</div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 font-medium">Oracle Ed25519 Signature</div>
            <div className="font-mono text-slate-300 break-all">{metadata.signature}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Payload Size</span>
              <span className="font-bold text-white">{metadata.rawPayloadSize} Bytes</span>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">On-Chain State</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProofDetailModal;
