import { clipboard } from "electron";
import { exec } from "child_process";
import type { PlatformModule } from "./index";

/**
 * Runs a PowerShell command and returns the stdout trimmed.
 */
function runPowerShell(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      `powershell -NoProfile -NonInteractive -Command "${command.replace(/"/g, '\\"')}"`,
      { timeout: 5000 },
      (err, stdout) => {
        if (err) {
          reject(err);
        } else {
          resolve(stdout.trim());
        }
      }
    );
  });
}

export const winPlatform: PlatformModule = {
  async captureCurrentApp(): Promise<string> {
    try {
      // Get the window title of the foreground window
      const result = await runPowerShell(
        `Add-Type -AssemblyName System.Windows.Forms; ` +
          `$p = Get-Process | Where-Object { $_.MainWindowHandle -eq ` +
          `[System.Windows.Forms.Form]::ActiveForm } | Select-Object -First 1; ` +
          `if ($p) { $p.ProcessName } else { ` +
          `(Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | ` +
          `Sort-Object -Property CPU -Descending | Select-Object -First 1).ProcessName }`
      );
      return result || "";
    } catch {
      // Fallback: use simpler approach
      try {
        const result = await runPowerShell(
          `(Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | ` +
            `Select-Object -First 1).ProcessName`
        );
        return result || "";
      } catch {
        return "";
      }
    }
  },

  async captureSelectedText(): Promise<string | null> {
    // Save current clipboard
    const savedClipboard = clipboard.readText();

    // Write sentinel to clipboard
    const sentinel = `__talky_sentinel_${Date.now()}_${Math.random()}__`;
    clipboard.writeText(sentinel);

    await new Promise((r) => setTimeout(r, 50));

    // Simulate Ctrl+C using PowerShell + SendKeys
    try {
      await runPowerShell(
        `Add-Type -AssemblyName System.Windows.Forms; ` +
          `[System.Windows.Forms.SendKeys]::SendWait('^c')`
      );
    } catch {
      clipboard.writeText(savedClipboard);
      return null;
    }

    // Wait for clipboard to update
    await new Promise((r) => setTimeout(r, 350));

    const newClipboard = clipboard.readText();
    clipboard.writeText(savedClipboard);

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
      return false;
    }

    try {
      // Simulate Ctrl+V using PowerShell + SendKeys
      await new Promise<void>((resolve) => {
        setTimeout(async () => {
          try {
            await runPowerShell(
              `Add-Type -AssemblyName System.Windows.Forms; ` +
                `[System.Windows.Forms.SendKeys]::SendWait('^v')`
            );
          } catch {
            // SendKeys failed — text is still in clipboard
          }
          // Restore clipboard after delay
          setTimeout(() => {
            clipboard.writeText(savedClipboard);
          }, 600);
          resolve();
        }, 250);
      });
      return true;
    } catch {
      return false;
    }
  },

  async requestAccessibilityPermission(): Promise<void> {
    // Windows doesn't require explicit accessibility permissions
  },
};
