import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  nativeImage,
  screen,
  session,
  systemPreferences,
} from "electron";
import { fork, ChildProcess } from "child_process";
import path from "path";
import { createServer } from "net";
import { existsSync, symlinkSync } from "fs";
import { autoUpdater } from "electron-updater";
import { getPlatformModule } from "./platform";

let mainWindow: BrowserWindow | null = null;
let islandWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let serverPort: number | null = null;
let previousAppName: string | null = null;
let isToggling = false;

const PREFERRED_PORT = 19589;

// ─── Utilities ─────────────────────────────────────────────────

function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address !== "string") {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        reject(new Error("Failed to get port"));
      }
    });
    server.on("error", reject);
  });
}

// Try a fixed port first so localStorage (settings, API keys) persists across restarts
function getPreferredPort(): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(PREFERRED_PORT, "127.0.0.1", () => {
      server.close(() => resolve(PREFERRED_PORT));
    });
    server.on("error", () => {
      // Preferred port taken — fall back to random
      getAvailablePort().then(resolve);
    });
  });
}

async function waitForServer(port: number, timeout = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}`);
      if (response.ok || response.status === 404) return;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Server failed to start within timeout");
}

function getStandaloneDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "standalone");
  }
  return path.join(__dirname, "..", ".next", "standalone");
}

function getPreloadPath(): string {
  return path.join(__dirname, "preload.js");
}

function restoreNodeModules(standaloneDir: string): void {
  const nodeModulesPath = path.join(standaloneDir, "node_modules");
  const renamedPath = path.join(standaloneDir, "_node_modules");

  if (existsSync(nodeModulesPath)) {
    console.log("node_modules already exists");
    return;
  }

  if (existsSync(renamedPath)) {
    try {
      symlinkSync(renamedPath, nodeModulesPath, "junction");
      console.log("Created node_modules symlink -> _node_modules");
    } catch (err) {
      console.error("Failed to create node_modules symlink:", err);
      throw new Error("Failed to restore node_modules.");
    }
  } else {
    throw new Error(
      `Neither node_modules nor _node_modules found in ${standaloneDir}`
    );
  }
}

// ─── Platform-specific operations ───────────────────────────────
// captureCurrentApp, captureSelectedText, pasteTextToApp are now in
// electron/platform/{mac,win}.ts — accessed via getPlatformModule()

// ─── Permissions ───────────────────────────────────────────────

async function requestMicrophoneAccess(): Promise<void> {
  if (process.platform === "darwin") {
    const status = systemPreferences.getMediaAccessStatus("microphone");
    console.log(`Microphone access status: ${status}`);

    // Don't call askForMediaAccess here — it can silently fail before windows are ready.
    // Instead, the renderer's getUserMedia() will trigger the macOS permission prompt
    // naturally when the user clicks the record button.
    if (status === "granted") {
      console.log("Microphone access already granted.");
    } else {
      console.log("Microphone access will be requested when recording starts.");
    }
  }
}

function setupPermissions(): void {
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      const allowed = ["media", "microphone", "audioCapture", "speech-recognition"];
      callback(allowed.includes(permission));
    }
  );
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    const allowed = ["media", "microphone", "audioCapture", "speech-recognition"];
    return allowed.includes(permission);
  });
}

// ─── Dev-mode asset linking ─────────────────────────────────────

function linkStandaloneAssets(standaloneDir: string): void {
  // Next.js standalone output requires .next/static and public to be
  // present inside the standalone directory.  In dev mode they live in
  // the project root, so we create symlinks.
  const projectRoot = path.join(__dirname, "..");

  const staticSrc = path.join(projectRoot, ".next", "static");
  const staticDst = path.join(standaloneDir, ".next", "static");
  if (existsSync(staticSrc) && !existsSync(staticDst)) {
    symlinkSync(staticSrc, staticDst, "junction");
  }

  const publicSrc = path.join(projectRoot, "public");
  const publicDst = path.join(standaloneDir, "public");
  if (existsSync(publicSrc) && !existsSync(publicDst)) {
    symlinkSync(publicSrc, publicDst, "junction");
  }
}

// ─── Next.js Server ────────────────────────────────────────────

async function startNextServer(port: number): Promise<void> {
  const standaloneDir = getStandaloneDir();
  const serverPath = path.join(standaloneDir, "server.js");

  if (!existsSync(serverPath)) {
    throw new Error(`Server file not found at: ${serverPath}`);
  }

  restoreNodeModules(standaloneDir);

  // Ensure static assets and public files are accessible
  if (!app.isPackaged) {
    linkStandaloneAssets(standaloneDir);
  }

  return new Promise((resolve, reject) => {
    serverProcess = fork(serverPath, [], {
      cwd: standaloneDir,
      env: {
        ...process.env,
        PORT: String(port),
        HOSTNAME: "127.0.0.1",
        NODE_ENV: "production",
      },
      stdio: "pipe",
    });

    serverProcess.stdout?.on("data", (data: Buffer) => {
      console.log(`[Next.js] ${data.toString().trim()}`);
    });
    serverProcess.stderr?.on("data", (data: Buffer) => {
      console.error(`[Next.js ERR] ${data.toString().trim()}`);
    });
    serverProcess.on("error", reject);
    serverProcess.on("exit", (code) => {
      console.log(`Server exited with code ${code}`);
    });

    waitForServer(port).then(resolve).catch(reject);
  });
}

// ─── Island Window (compact, bottom of screen) ────────────────

function createIslandWindow(port: number): void {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const islandWidth = 380;
  const islandHeight = 64;
  const islandX = Math.round((screenWidth - islandWidth) / 2);
  const islandY = screenHeight - islandHeight - 16;

  islandWindow = new BrowserWindow({
    width: islandWidth,
    height: islandHeight,
    x: islandX,
    y: islandY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    show: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  islandWindow.loadURL(`http://127.0.0.1:${port}/island`);

  islandWindow.on("closed", () => {
    islandWindow = null;
  });
}

// ─── Main Window (Full App) — lazy created ────────────────────

function createMainWindow(port: number): void {
  const isMac = process.platform === "darwin";

  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    ...(isMac
      ? { titleBarStyle: "hiddenInset", trafficLightPosition: { x: 16, y: 16 } }
      : { titleBarStyle: "default" }),
    backgroundColor: "#000000",
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── IPC Handlers ──────────────────────────────────────────────

function setupIPC(): void {
  ipcMain.on("expand-window", () => {
    // Lazy-create main window on first expand
    if (!mainWindow || mainWindow.isDestroyed()) {
      if (serverPort) {
        createMainWindow(serverPort);
      }
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
    if (islandWindow && !islandWindow.isDestroyed()) {
      islandWindow.hide();
    }
  });

  ipcMain.on("hide-island", () => {
    if (islandWindow && !islandWindow.isDestroyed()) {
      islandWindow.hide();
    }
  });

  ipcMain.handle("paste-to-app", async (_event, text: string) => {
    const platform = getPlatformModule();

    // Hide island before pasting
    if (islandWindow && !islandWindow.isDestroyed()) {
      islandWindow.hide();
    }

    const success = await platform.pasteTextToApp(text, previousAppName);
    return { success, targetApp: previousAppName || "clipboard" };
  });

  // Wake word triggered from renderer — start dictate session
  ipcMain.on("trigger-island", () => {
    handleShortcutTrigger(false);
  });

  // Auto-update IPC
  ipcMain.on("install-update", () => {
    autoUpdater.quitAndInstall();
  });

  // Microphone permission IPC
  ipcMain.handle("request-microphone-access", async () => {
    if (process.platform === "darwin") {
      const granted = await systemPreferences.askForMediaAccess("microphone");
      console.log(`Microphone access request result: ${granted}`);
      return granted;
    }
    return true; // Windows/Linux don't need system-level permission
  });

  ipcMain.handle("get-microphone-status", async () => {
    if (process.platform === "darwin") {
      const status = systemPreferences.getMediaAccessStatus("microphone");
      console.log(`Microphone status check: ${status}`);
      return status;
    }
    return "granted";
  });
}

// ─── Auto-Update ────────────────────────────────────────────────

function setupAutoUpdate(): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    console.log(`Update available: ${info.version}`);
    // Notify all windows
    const windows = [mainWindow, islandWindow].filter(
      (w) => w && !w.isDestroyed()
    );
    for (const win of windows) {
      win!.webContents.send("update-available", info.version);
    }
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log(`Update downloaded: ${info.version}`);
    const windows = [mainWindow, islandWindow].filter(
      (w) => w && !w.isDestroyed()
    );
    for (const win of windows) {
      win!.webContents.send("update-downloaded", info.version);
    }
  });

  autoUpdater.on("error", (err) => {
    console.error("Auto-update error:", err.message);
  });

  // Check for updates (non-blocking)
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.log("Update check skipped:", err.message);
  });
}

// ─── Global Shortcuts ───────────────────────────────────────────

async function handleShortcutTrigger(captureText: boolean): Promise<void> {
  if (isToggling) return;
  isToggling = true;

  try {
    if (!islandWindow || islandWindow.isDestroyed()) return;
    const platform = getPlatformModule();

    if (!islandWindow.isVisible()) {
      // Capture the currently focused app BEFORE showing the island
      previousAppName = await platform.captureCurrentApp();

      // Only capture selected text for transform mode (Option+Cmd+Space)
      const selectedText = captureText ? await platform.captureSelectedText() : null;

      islandWindow.show();
      islandWindow.focus();

      // Tell the island renderer to start a new session
      islandWindow.webContents.send(
        "island-toggle",
        previousAppName || "",
        selectedText || ""
      );
    } else {
      // Island is already visible — tell it to toggle (stop recording or dismiss)
      islandWindow.webContents.send("island-toggle", "", "");
    }
  } finally {
    setTimeout(() => {
      isToggling = false;
    }, 300);
  }
}

function registerShortcut(): void {
  // Option+Space → Dictate mode (always skip text capture)
  globalShortcut.register("Alt+Space", () => {
    handleShortcutTrigger(false);
  });

  // Ctrl+I → Transform mode (capture selected text)
  globalShortcut.register("CommandOrControl+I", () => {
    handleShortcutTrigger(true);
  });
}

// ─── Lifecycle ─────────────────────────────────────────────────

function killServer(): void {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
    serverProcess = null;
  }
}

app.on("ready", async () => {
  try {
    setupPermissions();
    await requestMicrophoneAccess();
    setupIPC();

    const port = await getPreferredPort();
    serverPort = port;
    await startNextServer(port);

    // Set the Dock icon explicitly (macOS only)
    if (process.platform === "darwin") {
      const iconPath = path.join(process.resourcesPath, "icon.icns");
      if (existsSync(iconPath)) {
        const icon = nativeImage.createFromPath(iconPath);
        app.dock?.setIcon(icon);
      }
    }

    // Only create the island — main window is lazy-created when user clicks expand
    createIslandWindow(port);
    registerShortcut();

    // Pre-load the local Whisper model in the background so first transcription is fast
    fetch(`http://127.0.0.1:${port}/api/transcribe`).catch(() => {});

    // Prompt for Accessibility permission early (needed for paste-to-app + selected text capture)
    const platform = getPlatformModule();
    await platform.requestAccessibilityPermission();

    // Check for updates (only in packaged builds)
    if (app.isPackaged) {
      setupAutoUpdate();
    }
  } catch (err) {
    console.error("Failed to start application:", err);
    dialog.showErrorBox(
      "Talky - Startup Error",
      `Failed to start the application.\n\n${err instanceof Error ? err.message : String(err)}\n\nMake sure Ollama is installed and try again.`
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  // Don't quit — island can still be toggled via shortcut
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  killServer();
});

app.on("before-quit", () => {
  killServer();
});

app.on("activate", () => {
  // Dock icon clicked — show the island only
  if (islandWindow && !islandWindow.isDestroyed()) {
    islandWindow.show();
    islandWindow.focus();
  }
});
