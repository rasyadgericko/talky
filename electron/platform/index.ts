export interface PlatformModule {
  /** Get the name of the currently focused application */
  captureCurrentApp(): Promise<string>;

  /** Copy the currently selected text from the focused application */
  captureSelectedText(): Promise<string | null>;

  /** Paste text into the previously focused application */
  pasteTextToApp(text: string, previousAppName: string | null): Promise<boolean>;

  /** Request accessibility / automation permissions (macOS-specific, no-op on Windows) */
  requestAccessibilityPermission(): Promise<void>;
}

let _platform: PlatformModule | null = null;

export function getPlatformModule(): PlatformModule {
  if (_platform) return _platform;

  if (process.platform === "darwin") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { macPlatform } = require("./mac");
    _platform = macPlatform;
  } else if (process.platform === "win32") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { winPlatform } = require("./win");
    _platform = winPlatform;
  } else {
    throw new Error(`Unsupported platform: ${process.platform}`);
  }

  return _platform!;
}
