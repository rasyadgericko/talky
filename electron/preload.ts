import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  resizeIsland: (width: number, height: number) => ipcRenderer.send("resize-island", width, height),
  hideIsland: () => ipcRenderer.send("hide-island"),
  triggerIsland: () => ipcRenderer.send("trigger-island"),
  pasteToApp: (text: string): Promise<{ success: boolean; targetApp: string }> =>
    ipcRenderer.invoke("paste-to-app", text),
  onIslandToggle: (callback: (appName: string, selectedText: string) => void) => {
    const handler = (_event: any, appName: string, selectedText: string) =>
      callback(appName, selectedText || "");
    ipcRenderer.on("island-toggle", handler);
    return () => {
      ipcRenderer.removeListener("island-toggle", handler);
    };
  },
  // Microphone permission
  requestMicrophoneAccess: (): Promise<boolean> =>
    ipcRenderer.invoke("request-microphone-access"),
  getMicrophoneStatus: (): Promise<string> =>
    ipcRenderer.invoke("get-microphone-status"),
  // Custom shortcuts
  updateShortcuts: (dictate: string, transform: string): Promise<boolean> =>
    ipcRenderer.invoke("update-shortcuts", dictate, transform),
  // Open external URL
  openExternal: (url: string) => ipcRenderer.send("open-external", url),
  // Auto-update
  installUpdate: () => ipcRenderer.send("install-update"),
  checkForUpdates: (): Promise<{ checking: boolean; version?: string; error?: string }> =>
    ipcRenderer.invoke("check-for-updates"),
  onUpdateAvailable: (callback: (version: string) => void) => {
    const handler = (_event: any, version: string) => callback(version);
    ipcRenderer.on("update-available", handler);
    return () => {
      ipcRenderer.removeListener("update-available", handler);
    };
  },
  onUpdateDownloaded: (callback: (version: string) => void) => {
    const handler = (_event: any, version: string) => callback(version);
    ipcRenderer.on("update-downloaded", handler);
    return () => {
      ipcRenderer.removeListener("update-downloaded", handler);
    };
  },
  onUpdateNotAvailable: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("update-not-available", handler);
    return () => {
      ipcRenderer.removeListener("update-not-available", handler);
    };
  },
});
