"use client";

import { useState, useEffect } from "react";

export default function UpdateNotification() {
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const cleanupAvailable = window.electronAPI?.onUpdateAvailable((version) => {
      setUpdateVersion(version);
    });

    const cleanupDownloaded = window.electronAPI?.onUpdateDownloaded((version) => {
      setUpdateVersion(version);
      setIsDownloaded(true);
    });

    return () => {
      cleanupAvailable?.();
      cleanupDownloaded?.();
    };
  }, []);

  if (!updateVersion || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 shadow-lg fade-in max-w-xs">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white/70"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white/90">
            {isDownloaded
              ? `v${updateVersion} ready to install`
              : `v${updateVersion} available`}
          </p>
          <p className="text-[10px] text-white/40 mt-0.5">
            {isDownloaded
              ? "Restart to apply the update"
              : "Downloading update..."}
          </p>
          {isDownloaded && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => window.electronAPI?.installUpdate()}
                className="px-3 py-1 bg-white text-black text-[10px] font-medium rounded-lg cursor-pointer hover:bg-neutral-200 transition-colors"
              >
                Restart Now
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="px-3 py-1 bg-white/10 text-white/60 text-[10px] rounded-lg cursor-pointer hover:bg-white/20 transition-colors"
              >
                Later
              </button>
            </div>
          )}
        </div>
        {!isDownloaded && (
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-white/60 transition-colors cursor-pointer"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
