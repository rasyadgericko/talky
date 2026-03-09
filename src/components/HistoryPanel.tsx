"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type TranscriptEntry,
  getHistory,
  searchHistory,
  deleteEntry,
  clearHistory,
} from "@/lib/history";

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HistoryPanel({ isOpen, onClose }: HistoryPanelProps) {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const refreshEntries = useCallback(() => {
    setEntries(query ? searchHistory(query) : getHistory());
  }, [query]);

  useEffect(() => {
    if (isOpen) refreshEntries();
  }, [isOpen, refreshEntries]);

  if (!isOpen) return null;

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = (id: string) => {
    deleteEntry(id);
    refreshEntries();
  };

  const handleClearAll = () => {
    clearHistory();
    refreshEntries();
    setShowClearConfirm(false);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-lg mx-4 overflow-hidden fade-in max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <h2 className="text-base font-semibold text-white">History</h2>
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-[10px] text-white/30 hover:text-red-400 transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-white/10 shrink-0">
          <input
            type="text"
            placeholder="Search transcripts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/30 transition-colors"
          />
        </div>

        {/* Clear Confirmation */}
        {showClearConfirm && (
          <div className="px-5 py-3 bg-red-500/10 border-b border-red-500/20 shrink-0">
            <p className="text-xs text-red-400 mb-2">Delete all transcript history? This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={handleClearAll} className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg cursor-pointer">Delete All</button>
              <button onClick={() => setShowClearConfirm(false)} className="px-3 py-1.5 bg-white/10 text-white text-xs rounded-lg cursor-pointer">Cancel</button>
            </div>
          </div>
        )}

        {/* Entries */}
        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-xs text-white/30">
                {query ? "No results found" : "No transcripts yet"}
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-1.5">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    className="w-full text-left px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] text-white/30">{formatTime(entry.timestamp)}</span>
                      <div className="flex items-center gap-1.5">
                        {entry.mode && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                            {entry.mode}
                          </span>
                        )}
                        {entry.appName && (
                          <span className="text-[9px] text-white/20">{entry.appName}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-white/70 line-clamp-2">{entry.text}</p>
                  </button>

                  {expandedId === entry.id && (
                    <div className="px-4 pb-3 space-y-2 border-t border-white/5 pt-2">
                      <div>
                        <p className="text-[10px] text-white/30 mb-1">Transcript</p>
                        <p className="text-xs text-white/80 whitespace-pre-wrap">{entry.text}</p>
                      </div>
                      {entry.optimizedText && (
                        <div>
                          <p className="text-[10px] text-white/30 mb-1">Optimized</p>
                          <p className="text-xs text-white/80 whitespace-pre-wrap">{entry.optimizedText}</p>
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleCopy(entry.optimizedText || entry.text, entry.id)}
                          className="text-[10px] text-white/40 hover:text-white transition-colors cursor-pointer"
                        >
                          {copied === entry.id ? "Copied!" : "Copy"}
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-[10px] text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-white/10 shrink-0">
          <p className="text-[10px] text-white/20 text-center">
            {entries.length} transcript{entries.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
