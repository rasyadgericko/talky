"use client";

import { useState } from "react";
import { getSession, openCheckout } from "@/lib/auth";

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
  reason?: "word_limit" | "transform" | "language";
}

const REASON_MESSAGES: Record<string, string> = {
  word_limit: "You've reached your free monthly word limit (5,000 words).",
  transform: "AI Transform modes (Optimize, Refine, Summarize) are Pro features.",
  language: "Multiple languages are available with Pro.",
};

export default function UpgradePrompt({
  isOpen,
  onClose,
  onSignIn,
  reason = "word_limit",
}: UpgradePromptProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const session = await getSession();
      if (!session) {
        onSignIn();
        return;
      }
      await openCheckout();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-sm mx-4 p-6 fade-in">
        <div className="text-center space-y-4">
          {/* Icon */}
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white">Upgrade to Pro</h3>
            <p className="text-sm text-white/50">{REASON_MESSAGES[reason]}</p>
          </div>

          {/* Features */}
          <div className="text-left space-y-2 py-2">
            {[
              "Unlimited words per month",
              "Groq cloud transcription",
              "AI Transform (Optimize, Refine, Summarize)",
              "15+ languages supported",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-xs text-white/70">{feature}</span>
              </div>
            ))}
          </div>

          {/* Price */}
          <div className="py-1">
            <span className="text-2xl font-bold text-white">$6</span>
            <span className="text-sm text-white/40"> / month</span>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? "Opening checkout..." : "Upgrade to Pro"}
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 text-sm text-white/40 hover:text-white/60 transition-colors cursor-pointer"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
