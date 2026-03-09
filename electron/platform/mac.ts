import { clipboard, systemPreferences } from "electron";
import { exec } from "child_process";
import type { PlatformModule } from "./index";

export const macPlatform: PlatformModule = {
  async captureCurrentApp(): Promise<string> {
    return new Promise((resolve) => {
      exec(
        `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`,
        (err, stdout) => {
          if (err) {
            resolve("");
          } else {
            resolve(stdout.trim());
          }
        }
      );
    });
  },

  async captureSelectedText(): Promise<string | null> {
    // Need accessibility permissions to simulate keystrokes
    const trusted = systemPreferences.isTrustedAccessibilityClient(false);
    if (!trusted) return null;

    // Save current clipboard
    const savedClipboard = clipboard.readText();

    // Write a unique sentinel to clipboard — this lets us reliably detect
    // whether Cmd+C actually copied something, even if the selected text
    // happens to match what was already in the clipboard.
    const sentinel = `__talky_sentinel_${Date.now()}_${Math.random()}__`;
    clipboard.writeText(sentinel);

    // Small delay to ensure sentinel is written
    await new Promise((r) => setTimeout(r, 50));

    // Simulate Cmd+C to copy whatever is selected in the frontmost app
    await new Promise<void>((resolve) => {
      exec(
        `osascript -e 'tell application "System Events" to keystroke "c" using command down'`,
        () => {
          // Longer delay for heavier apps (VS Code, Chrome, etc.)
          setTimeout(resolve, 350);
        }
      );
    });

    const newClipboard = clipboard.readText();

    // Restore original clipboard
    clipboard.writeText(savedClipboard);

    // If clipboard is no longer the sentinel, Cmd+C succeeded → text was selected
    if (newClipboard !== sentinel && newClipboard.trim()) {
      return newClipboard.trim();
    }

    return null;
  },

  async pasteTextToApp(
    text: string,
    previousAppName: string | null
  ): Promise<boolean> {
    // Save current clipboard content
    const savedClipboard = clipboard.readText();

    // Write text to clipboard
    clipboard.writeText(text);

    if (!previousAppName) {
      // No target app — just leave text in clipboard
      return false;
    }

    // Check accessibility permissions (needed for keystroke simulation)
    // Only check — don't prompt again here, the startup prompt handles it
    const trusted = systemPreferences.isTrustedAccessibilityClient(false);
    if (!trusted) {
      return false;
    }

    // Sanitize app name
    const appName = previousAppName
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');

    return new Promise((resolve) => {
      // Activate the previous app
      exec(
        `osascript -e 'tell application "${appName}" to activate'`,
        (err) => {
          if (err) {
            resolve(false);
            return;
          }
          // Wait for app to come to foreground, then simulate Cmd+V
          setTimeout(() => {
            exec(
              `osascript -e 'tell application "System Events" to keystroke "v" using command down'`,
              (err2) => {
                // Restore original clipboard after a short delay
                setTimeout(() => {
                  clipboard.writeText(savedClipboard);
                }, 600);
                resolve(!err2);
              }
            );
          }, 250);
        }
      );
    });
  },

  async requestAccessibilityPermission(): Promise<void> {
    // Only prompt if not already trusted — passing true shows the system dialog
    const trusted = systemPreferences.isTrustedAccessibilityClient(false);
    if (!trusted) {
      systemPreferences.isTrustedAccessibilityClient(true);
    }
  },
};
