"use client";

import { useState } from "react";

interface OnboardingProps {
  onComplete: () => void;
}

const STEPS = [
  {
    title: "Welcome to Talky",
    subtitle: "Your voice, your keyboard",
    description:
      "Talky turns your speech into text and pastes it directly into any app. Let's show you how it works.",
    icon: (
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    ),
  },
  {
    title: "Dictate Mode",
    subtitle: "Speak and paste anywhere",
    description:
      "Press the shortcut, speak naturally, and Talky transcribes your voice and pastes the text into your active app.",
    icon: (
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#22c55e"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    ),
    shortcut: { keys: ["Option", "Space"], label: "Start / Stop Dictation" },
  },
  {
    title: "Transform Mode",
    subtitle: "Select text, speak to transform",
    description:
      "Select any text in an app, press the shortcut, and tell Talky what to do — \"fix the grammar\", \"make it shorter\", \"translate to Spanish\". AI transforms the text and replaces it.",
    icon: (
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#a855f7"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    shortcut: { keys: ["Ctrl", "I"], label: "Transform Selected Text" },
  },
  {
    title: "Quick Tips",
    subtitle: "Get the most out of Talky",
    description: "",
    icon: (
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#facc15"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    tips: [
      { key: "ESC", text: "Dismiss the island" },
      { key: "Gear icon", text: "Open settings to configure AI provider, speech engine, and language" },
      { key: "Provider badge", text: "Click the provider name on the bar to quickly switch between Groq, Cerebras, and Ollama" },
    ],
  },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <h2 className="text-sm font-semibold text-white">Get Started</h2>
        <button
          onClick={onComplete}
          className="text-[11px] text-white/40 hover:text-white/70 transition-colors cursor-pointer"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-5 text-center gap-4 overflow-y-auto">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          {current.icon}
        </div>

        {/* Title */}
        <div>
          <h3 className="text-base font-semibold text-white">{current.title}</h3>
          <p className="text-xs text-white/40 mt-0.5">{current.subtitle}</p>
        </div>

        {/* Description */}
        {current.description && (
          <p className="text-xs text-white/60 leading-relaxed max-w-[300px]">
            {current.description}
          </p>
        )}

        {/* Shortcut Badge */}
        {current.shortcut && (
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 w-full max-w-[280px]">
            <div className="flex items-center justify-center gap-2 mb-2">
              {current.shortcut.keys.map((key, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-white/20 text-xs">+</span>}
                  <kbd className="px-2.5 py-1 bg-white/10 border border-white/15 rounded-lg text-xs font-medium text-white min-w-[36px] text-center">
                    {key}
                  </kbd>
                </span>
              ))}
            </div>
            <p className="text-[11px] text-white/40">{current.shortcut.label}</p>
          </div>
        )}

        {/* Tips List */}
        {current.tips && (
          <div className="w-full max-w-[300px] space-y-2">
            {current.tips.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-white/[0.03] border border-white/10 rounded-xl p-3 text-left"
              >
                <kbd className="shrink-0 px-2 py-0.5 bg-white/10 border border-white/15 rounded-md text-[10px] font-medium text-white">
                  {tip.key}
                </kbd>
                <p className="text-xs text-white/60 leading-relaxed">{tip.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="px-4 py-3 border-t border-white/10 shrink-0">
        {/* Dots */}
        <div className="flex items-center justify-center gap-1.5 mb-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-4 bg-white" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-2 text-xs font-medium text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              Back
            </button>
          )}
          <button
            onClick={() => (isLast ? onComplete() : setStep(step + 1))}
            className="flex-1 py-2 text-xs font-medium text-black bg-white hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
          >
            {isLast ? "Get Started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
