import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  expandWindow: () => ipcRenderer.send("expand-window"),
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
  // Auto-update
  installUpdate: () => ipcRenderer.send("install-update"),
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
});
