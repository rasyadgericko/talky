interface Window {
  electronAPI?: {
    expandWindow: () => void;
    hideIsland: () => void;
    triggerIsland: () => void;
    pasteToApp: (text: string) => Promise<{ success: boolean; targetApp: string }>;
    onIslandToggle: (callback: (appName: string, selectedText: string) => void) => () => void;
    // Microphone permission
    requestMicrophoneAccess: () => Promise<boolean>;
    getMicrophoneStatus: () => Promise<string>;
    // Auto-update
    installUpdate: () => void;
    onUpdateAvailable: (callback: (version: string) => void) => () => void;
    onUpdateDownloaded: (callback: (version: string) => void) => () => void;
  };
}
