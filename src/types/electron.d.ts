interface Window {
  electronAPI?: {
    resizeIsland: (width: number, height: number) => void;
    hideIsland: () => void;
    triggerIsland: () => void;
    pasteToApp: (text: string) => Promise<{ success: boolean; targetApp: string }>;
    onIslandToggle: (callback: (appName: string, selectedText: string) => void) => () => void;
    // Microphone permission
    requestMicrophoneAccess: () => Promise<boolean>;
    getMicrophoneStatus: () => Promise<string>;
    // Custom shortcuts
    updateShortcuts: (dictate: string, transform: string) => Promise<boolean>;
    // Auto-update
    installUpdate: () => void;
    checkForUpdates: () => Promise<{ checking: boolean; version?: string; error?: string }>;
    onUpdateAvailable: (callback: (version: string) => void) => () => void;
    onUpdateDownloaded: (callback: (version: string) => void) => () => void;
    onUpdateNotAvailable: (callback: () => void) => () => void;
    // External links
    openExternal: (url: string) => void;
  };
}
