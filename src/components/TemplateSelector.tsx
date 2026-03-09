"use client";

import { useState, useEffect, useRef } from "react";
import { type PromptTemplate, getTemplates } from "@/lib/templates";

interface TemplateSelectorProps {
  onSelect: (instruction: string) => void;
  /** Compact mode for Island UI */
  compact?: boolean;
}

export default function TemplateSelector({ onSelect, compact = false }: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTemplates(getTemplates());
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 transition-colors cursor-pointer ${
          compact
            ? "px-1.5 py-0.5 rounded text-[9px] text-white/40 hover:text-white hover:bg-white/10"
            : "px-3 py-1.5 rounded-lg text-xs text-muted hover:text-foreground hover:bg-white/5 border border-white/10"
        }`}
        title="Quick templates"
      >
        <svg width={compact ? 10 : 12} height={compact ? 10 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        {!compact && "Templates"}
      </button>

      {isOpen && (
        <div className={`absolute z-50 ${compact ? "bottom-full mb-1 right-0" : "top-full mt-1 left-0"} w-56 bg-[#111] border border-white/10 rounded-lg overflow-hidden shadow-xl`}>
          <div className="py-1 max-h-48 overflow-y-auto">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  onSelect(t.instruction);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors cursor-pointer"
              >
                <p className="text-xs text-white font-medium">{t.name}</p>
                <p className="text-[10px] text-white/30 truncate">{t.instruction}</p>
              </button>
            ))}
            {templates.length === 0 && (
              <p className="px-3 py-2 text-xs text-white/30">No templates</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
