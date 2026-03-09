"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type Snippet,
  getSnippets,
  searchSnippets,
  deleteSnippet,
  incrementUsedCount,
  clearSnippets,
} from "@/lib/snippets";

interface SnippetsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPaste: (text: string) => void;
  inline?: boolean;
}

export default function SnippetsPanel({ isOpen, onClose, onPaste, inline = false }: SnippetsPanelProps) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const refresh = useCallback(() => {
    setSnippets(query ? searchSnippets(query) : getSnippets());
  }, [query]);

  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, refresh]);

  if (!isOpen) return null;

  const handlePaste = (snippet: Snippet) => {
    incrementUsedCount(snippet.id);
    onPaste(snippet.text);
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = (id: string) => {
    deleteSnippet(id);
    refresh();
  };

  const handleClearAll = () => {
    clearSnippets();
    refresh();
    setShowClearConfirm(false);
  };

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <h2 className="text-sm font-semibold text-white">Snippets</h2>
        <div className="flex items-center gap-2">
          {snippets.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-[10px] text-white/30 hover:text-red-400 transition-colors cursor-pointer"
            >
              Clear All
            </button>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-white/10 shrink-0">
        <input
          type="text"
          placeholder="Search snippets..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/30 transition-colors"
        />
      </div>

      {/* Clear Confirmation */}
      {showClearConfirm && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 shrink-0">
          <p className="text-xs text-red-400 mb-2">Delete all snippets? This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={handleClearAll} className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg cursor-pointer">Delete All</button>
            <button onClick={() => setShowClearConfirm(false)} className="px-3 py-1 bg-white/10 text-white text-xs rounded-lg cursor-pointer">Cancel</button>
          </div>
        </div>
      )}

      {/* Snippets List */}
      <div className="flex-1 overflow-y-auto">
        {snippets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <p className="text-xs text-white/30">
              {query ? "No snippets found" : "No snippets saved yet"}
            </p>
            {!query && (
              <p className="text-[10px] text-white/20 text-center px-6">
                Save transcripts as snippets from the History panel for quick reuse.
              </p>
            )}
          </div>
        ) : (
          <div className="p-3 space-y-1.5">
            {snippets.map((snippet) => (
              <div
                key={snippet.id}
                className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden"
              >
                <div className="px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs text-white/80 font-medium truncate flex-1">{snippet.title}</p>
                    {snippet.usedCount > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 shrink-0">
                        used {snippet.usedCount}x
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/40 line-clamp-2">{snippet.text}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handlePaste(snippet)}
                      className="text-[10px] text-green-400/70 hover:text-green-400 transition-colors cursor-pointer font-medium"
                    >
                      Paste
                    </button>
                    <button
                      onClick={() => handleCopy(snippet.text, snippet.id)}
                      className="text-[10px] text-white/40 hover:text-white transition-colors cursor-pointer"
                    >
                      {copied === snippet.id ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={() => handleDelete(snippet.id)}
                      className="text-[10px] text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/10 shrink-0">
        <p className="text-[10px] text-white/20 text-center">
          {snippets.length} snippet{snippets.length !== 1 ? "s" : ""}
        </p>
      </div>
    </>
  );

  if (inline) {
    return <div className="flex flex-col flex-1 overflow-hidden">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md mx-4 overflow-hidden fade-in max-h-[85vh] flex flex-col">
        {content}
      </div>
    </div>
  );
}
