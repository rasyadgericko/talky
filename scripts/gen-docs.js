const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak
} = require("docx");
const fs = require("fs");

// ─── Color Palette ───
const ACCENT = "2563EB";      // Blue-600
const ACCENT_LIGHT = "DBEAFE"; // Blue-100
const DARK = "111827";         // Gray-900
const MEDIUM = "374151";       // Gray-700
const LIGHT_BG = "F3F4F6";    // Gray-100
const WHITE = "FFFFFF";
const BORDER_COLOR = "D1D5DB"; // Gray-300
const CODE_BG = "F9FAFB";     // Gray-50
const PURPLE = "7C3AED";      // Purple-600
const PURPLE_LIGHT = "EDE9FE"; // Purple-100

// ─── Borders ───
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
};

// ─── Helpers ───
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: ACCENT, type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, color: WHITE, font: "Arial", size: 20 })],
    })],
  });
}

function dataCell(text, width, opts = {}) {
  const runs = Array.isArray(text)
    ? text
    : [new TextRun({ text, font: "Arial", size: 20, color: DARK, ...opts })];
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: cellMargins,
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ children: runs })],
  });
}

function codeCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: cellMargins,
    shading: { fill: CODE_BG, type: ShadingType.CLEAR },
    children: [new Paragraph({
      children: [new TextRun({ text, font: "Courier New", size: 18, color: MEDIUM })],
    })],
  });
}

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, children: [new TextRun(text)] });
}

function bodyText(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: DARK, ...opts })],
  });
}

function bulletItem(text, reference = "bullets", level = 0) {
  return new Paragraph({
    numbering: { reference, level },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: DARK })],
  });
}

function numberedItem(text, reference = "numbers", level = 0) {
  return new Paragraph({
    numbering: { reference, level },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: DARK })],
  });
}

function spacer() {
  return new Paragraph({ spacing: { after: 200 }, children: [] });
}

function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR } },
    children: [],
  });
}

function infoBox(label, text) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: ACCENT },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: ACCENT },
              left: { style: BorderStyle.SINGLE, size: 6, color: ACCENT },
              right: { style: BorderStyle.SINGLE, size: 1, color: ACCENT },
            },
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: ACCENT_LIGHT, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 200, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: label + ": ", bold: true, font: "Arial", size: 20, color: ACCENT }),
                  new TextRun({ text, font: "Arial", size: 20, color: DARK }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ─── Document ───
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Arial", size: 22 } },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: DARK },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: ACCENT },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: MEDIUM },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
      {
        reference: "numbers",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
      {
        reference: "numbersB",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  },
  sections: [
    // ═══════════════════════════════════════════════
    // COVER PAGE
    // ═══════════════════════════════════════════════
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        new Paragraph({ spacing: { before: 3600 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "TALKY", font: "Arial", size: 72, bold: true, color: DARK })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Product Documentation", font: "Arial", size: 32, color: ACCENT })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [new TextRun({ text: "Version 1.0", font: "Arial", size: 28, color: MEDIUM })],
        }),
        divider(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Speech-to-Text Desktop Application for macOS", font: "Arial", size: 22, color: MEDIUM })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Built with Next.js + Electron + Whisper AI", font: "Arial", size: 20, color: MEDIUM })],
        }),
        new Paragraph({ spacing: { before: 2400 }, children: [] }),
        divider(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Date: ", font: "Arial", size: 20, color: MEDIUM }),
            new TextRun({ text: "March 9, 2026", font: "Arial", size: 20, bold: true, color: DARK }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "Author: ", font: "Arial", size: 20, color: MEDIUM }),
            new TextRun({ text: "RYC Works", font: "Arial", size: 20, bold: true, color: DARK }),
          ],
        }),
      ],
    },

    // ═══════════════════════════════════════════════
    // TABLE OF CONTENTS
    // ═══════════════════════════════════════════════
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "Talky v1.0 \u2014 Product Documentation", font: "Arial", size: 16, color: MEDIUM, italics: true })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Page ", font: "Arial", size: 16, color: MEDIUM }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: MEDIUM }),
            ],
          })],
        }),
      },
      children: [
        heading("Table of Contents"),
        spacer(),
        bodyText("1. Executive Summary"),
        bodyText("2. Product Overview"),
        bodyText("3. Technical Architecture"),
        bodyText("4. Core Features"),
        bodyText("5. Keyboard Shortcuts"),
        bodyText("6. API Endpoints"),
        bodyText("7. Settings & Configuration"),
        bodyText("8. Technology Stack & Dependencies"),
        bodyText("9. Build & Deployment"),
        bodyText("10. File Structure"),
        bodyText("11. Known Limitations"),
        bodyText("12. Version History"),
        bodyText("13. Future Roadmap (v2)"),
      ],
    },

    // ═══════════════════════════════════════════════
    // MAIN CONTENT
    // ═══════════════════════════════════════════════
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "Talky v1.0 \u2014 Product Documentation", font: "Arial", size: 16, color: MEDIUM, italics: true })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Page ", font: "Arial", size: 16, color: MEDIUM }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: MEDIUM }),
            ],
          })],
        }),
      },
      children: [
        // ═══ 1. EXECUTIVE SUMMARY ═══
        heading("1. Executive Summary"),
        bodyText("Talky is a macOS desktop application that converts speech to text and intelligently transforms written content using AI. It operates as a system-wide utility, accessible from any application through global keyboard shortcuts. The app features a Dynamic Island-style floating interface for quick voice input and a full-window mode for transcript management and settings."),
        spacer(),
        infoBox("Key Value Proposition", "Voice-to-text and AI-powered text transformation accessible system-wide on macOS, with support for both local and cloud-based processing."),
        spacer(),

        // ═══ 2. PRODUCT OVERVIEW ═══
        heading("2. Product Overview"),

        heading("2.1 What is Talky?", HeadingLevel.HEADING_2),
        bodyText("Talky is a productivity tool that enables users to dictate text directly into any macOS application and transform existing text using voice commands. It supports multiple AI providers and speech recognition engines, giving users flexibility between local privacy and cloud speed."),
        spacer(),

        heading("2.2 Target Platform", HeadingLevel.HEADING_2),
        bulletItem("macOS (Apple Silicon / arm64)"),
        bulletItem("Distributed as DMG installer"),
        bulletItem("App ID: com.talky.app"),
        spacer(),

        heading("2.3 Two Operating Modes", HeadingLevel.HEADING_2),

        // Mode table
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2000, 3680, 3680],
          rows: [
            new TableRow({
              children: [
                headerCell("Mode", 2000),
                headerCell("Description", 3680),
                headerCell("Shortcut", 3680),
              ],
            }),
            new TableRow({
              children: [
                dataCell("Dictate", 2000, { bold: true }),
                dataCell("Speak and paste transcribed text into the active application. Auto-stops when silence is detected.", 3680),
                codeCell("Option + Space", 3680),
              ],
            }),
            new TableRow({
              children: [
                dataCell("Transform", 2000, { bold: true }),
                dataCell("Select text in any app, speak a voice command (e.g., \"summarize\", \"fix grammar\"), and the AI transforms the selected text.", 3680),
                codeCell("Ctrl + I (Cmd + I)", 3680),
              ],
            }),
          ],
        }),
        spacer(),

        // ═══ 3. TECHNICAL ARCHITECTURE ═══
        new Paragraph({ children: [new PageBreak()] }),
        heading("3. Technical Architecture"),

        heading("3.1 System Architecture", HeadingLevel.HEADING_2),
        bodyText("Talky uses a hybrid architecture combining a Next.js web application with Electron for native desktop capabilities:"),
        spacer(),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2400, 6960],
          rows: [
            new TableRow({
              children: [
                headerCell("Layer", 2400),
                headerCell("Technology", 6960),
              ],
            }),
            new TableRow({
              children: [
                dataCell("Desktop Shell", 2400, { bold: true }),
                dataCell("Electron 35 (Chromium-based)", 6960),
              ],
            }),
            new TableRow({
              children: [
                dataCell("Frontend", 2400, { bold: true }),
                dataCell("Next.js 16.1.6 + React 19.2.3 + Tailwind CSS v4", 6960),
              ],
            }),
            new TableRow({
              children: [
                dataCell("Speech-to-Text", 2400, { bold: true }),
                dataCell("Whisper AI (local via @xenova/transformers or cloud via Groq API)", 6960),
              ],
            }),
            new TableRow({
              children: [
                dataCell("AI Processing", 2400, { bold: true }),
                dataCell("Groq (llama-3.3-70b), Cerebras (llama3.1-8b), Ollama (local, configurable)", 6960),
              ],
            }),
            new TableRow({
              children: [
                dataCell("Build System", 2400, { bold: true }),
                dataCell("electron-builder (DMG output for arm64)", 6960),
              ],
            }),
          ],
        }),
        spacer(),

        heading("3.2 Process Architecture", HeadingLevel.HEADING_2),
        bulletItem("Main Process (Electron): Window management, global shortcuts, system tray, clipboard/paste automation via AppleScript"),
        bulletItem("Renderer Process: Next.js app running the UI (island overlay + full window)"),
        bulletItem("Next.js API Routes: Handle transcription (/api/transcribe), AI optimization (/api/optimize), and health checks (/api/health)"),
        bulletItem("Standalone Server: Next.js production server bundled as extraResource for Electron distribution"),
        spacer(),

        heading("3.3 Port Persistence Strategy", HeadingLevel.HEADING_2),
        bodyText("To ensure settings and API keys persist across app restarts, Talky uses a fixed preferred port (19589) for the local Next.js server. This ensures the same localStorage origin is used each launch. If the preferred port is occupied, it falls back to a random available port."),
        spacer(),

        // ═══ 4. CORE FEATURES ═══
        new Paragraph({ children: [new PageBreak()] }),
        heading("4. Core Features"),

        heading("4.1 Dynamic Island Interface", HeadingLevel.HEADING_2),
        bodyText("A compact floating overlay that appears at the top of the screen when activated. Inspired by Apple\u2019s Dynamic Island, it provides:"),
        bulletItem("Mic button with pulse animation during recording"),
        bulletItem("Real-time status text (Recording, Transcribing, Pasting, Transforming)"),
        bulletItem("Provider selector (click-to-cycle: Groq \u2192 Cerebras \u2192 Ollama)"),
        bulletItem("Expand button to open full window"),
        bulletItem("Close/dismiss button"),
        bulletItem("Purple accent for Transform mode, red for Dictate mode"),
        spacer(),

        heading("4.2 Silence Detection & Auto-Stop", HeadingLevel.HEADING_2),
        bodyText("Recording automatically stops when silence is detected, eliminating the need to manually press a shortcut or button:"),
        spacer(),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [4680, 4680],
          rows: [
            new TableRow({
              children: [
                headerCell("Parameter", 4680),
                headerCell("Value", 4680),
              ],
            }),
            new TableRow({
              children: [
                dataCell("Silence Threshold (RMS)", 4680),
                codeCell("0.01", 4680),
              ],
            }),
            new TableRow({
              children: [
                dataCell("Silence Duration to Trigger Stop", 4680),
                codeCell("2,000 ms (2 seconds)", 4680),
              ],
            }),
            new TableRow({
              children: [
                dataCell("Minimum Speech Duration", 4680),
                codeCell("800 ms (0.8 seconds)", 4680),
              ],
            }),
          ],
        }),
        spacer(),
        bodyText("The system monitors audio levels using RMS (Root Mean Square) calculation on each audio buffer. After detecting speech, it waits for 2 seconds of continuous silence before automatically stopping and sending audio for transcription."),
        spacer(),

        heading("4.3 Multi-Provider AI", HeadingLevel.HEADING_2),
        bodyText("Talky supports three AI providers for text transformation, selectable from both the island and the main window:"),
        spacer(),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2000, 3180, 2180, 2000],
          rows: [
            new TableRow({
              children: [
                headerCell("Provider", 2000),
                headerCell("Model", 3180),
                headerCell("Type", 2180),
                headerCell("API Key", 2000),
              ],
            }),
            new TableRow({
              children: [
                dataCell("Groq", 2000, { bold: true }),
                codeCell("llama-3.3-70b-versatile", 3180),
                dataCell("Cloud (free)", 2180),
                dataCell("Required", 2000),
              ],
            }),
            new TableRow({
              children: [
                dataCell("Cerebras", 2000, { bold: true }),
                codeCell("llama3.1-8b", 3180),
                dataCell("Cloud (free)", 2180),
                dataCell("Required", 2000),
              ],
            }),
            new TableRow({
              children: [
                dataCell("Ollama", 2000, { bold: true }),
                codeCell("llama3.2 (default)", 3180),
                dataCell("Local", 2180),
                dataCell("None", 2000),
              ],
            }),
          ],
        }),
        spacer(),

        heading("4.4 Dual Speech Engines", HeadingLevel.HEADING_2),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2400, 3480, 3480],
          rows: [
            new TableRow({
              children: [
                headerCell("Engine", 2400),
                headerCell("Details", 3480),
                headerCell("Requirements", 3480),
              ],
            }),
            new TableRow({
              children: [
                dataCell("Whisper Local", 2400, { bold: true }),
                dataCell("Xenova/whisper-base (~145MB model, downloaded on first use)", 3480),
                dataCell("No internet needed after first download", 3480),
              ],
            }),
            new TableRow({
              children: [
                dataCell("Whisper Groq", 2400, { bold: true }),
                dataCell("whisper-large-v3-turbo via Groq Cloud API", 3480),
                dataCell("Groq API key required", 3480),
              ],
            }),
          ],
        }),
        spacer(),

        heading("4.5 Multi-Language Support", HeadingLevel.HEADING_2),
        bulletItem("Auto-detect (default)"),
        bulletItem("English"),
        bulletItem("Indonesian"),
        spacer(),

        heading("4.6 System-Wide Paste", HeadingLevel.HEADING_2),
        bodyText("After transcription, Talky automatically pastes text into the previously active application using AppleScript automation. The process:"),
        numberedItem("Captures the active application name before showing the island", "numbersB"),
        numberedItem("Writes transcribed/transformed text to the system clipboard", "numbersB"),
        numberedItem("Executes Cmd+V paste via AppleScript in the target application", "numbersB"),
        numberedItem("Uses a sentinel-based clipboard detection to avoid stale paste conflicts", "numbersB"),
        spacer(),

        heading("4.7 Text Transformation Modes", HeadingLevel.HEADING_2),
        bodyText("The /api/optimize endpoint supports four transformation modes:"),
        bulletItem("optimize \u2014 Improve writing quality and clarity"),
        bulletItem("refine \u2014 Polish grammar and style"),
        bulletItem("summarize \u2014 Create a concise summary"),
        bulletItem("transform \u2014 Apply custom voice instruction (used by Transform mode)"),
        spacer(),

        // ═══ 5. KEYBOARD SHORTCUTS ═══
        new Paragraph({ children: [new PageBreak()] }),
        heading("5. Keyboard Shortcuts"),
        spacer(),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2800, 3280, 3280],
          rows: [
            new TableRow({
              children: [
                headerCell("Shortcut", 2800),
                headerCell("Action", 3280),
                headerCell("Context", 3280),
              ],
            }),
            new TableRow({
              children: [
                codeCell("Option + Space", 2800),
                dataCell("Toggle Dictate mode (start/stop recording)", 3280),
                dataCell("Global (system-wide)", 3280),
              ],
            }),
            new TableRow({
              children: [
                codeCell("Ctrl + I / Cmd + I", 2800),
                dataCell("Activate Transform mode (captures selected text)", 3280),
                dataCell("Global (system-wide)", 3280),
              ],
            }),
            new TableRow({
              children: [
                codeCell("Escape", 2800),
                dataCell("Cancel recording and dismiss island", 3280),
                dataCell("When island is visible", 3280),
              ],
            }),
          ],
        }),
        spacer(),
        infoBox("Note", "Option+Space always enters Dictate mode regardless of text selection. Use Ctrl+I specifically for Transform mode."),
        spacer(),

        // ═══ 6. API ENDPOINTS ═══
        heading("6. API Endpoints"),
        bodyText("All API routes are served by the Next.js app running on the local server."),
        spacer(),

        heading("6.1 POST /api/transcribe", HeadingLevel.HEADING_2),
        bodyText("Converts raw PCM audio (16kHz mono Float32) to text using Whisper."),
        spacer(),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2400, 6960],
          rows: [
            new TableRow({ children: [headerCell("Parameter", 2400), headerCell("Description", 6960)] }),
            new TableRow({ children: [codeCell("engine", 2400), dataCell("\"whisper-local\" or \"whisper-groq\"", 6960)] }),
            new TableRow({ children: [codeCell("lang", 2400), dataCell("\"auto\", \"en\", or \"id\"", 6960)] }),
            new TableRow({ children: [codeCell("apiKey", 2400), dataCell("Groq API key (required when engine is whisper-groq)", 6960)] }),
          ],
        }),
        spacer(),

        heading("6.2 POST /api/optimize", HeadingLevel.HEADING_2),
        bodyText("Transforms text using AI. Accepts JSON body with text, mode, optional instruction, provider, and API key."),
        spacer(),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2400, 6960],
          rows: [
            new TableRow({ children: [headerCell("Field", 2400), headerCell("Description", 6960)] }),
            new TableRow({ children: [codeCell("text", 2400), dataCell("The text to transform", 6960)] }),
            new TableRow({ children: [codeCell("mode", 2400), dataCell("\"optimize\", \"refine\", \"summarize\", or \"transform\"", 6960)] }),
            new TableRow({ children: [codeCell("instruction", 2400), dataCell("Custom voice instruction (for transform mode)", 6960)] }),
            new TableRow({ children: [codeCell("provider", 2400), dataCell("\"groq\", \"cerebras\", or \"ollama\"", 6960)] }),
          ],
        }),
        spacer(),

        heading("6.3 GET /api/health", HeadingLevel.HEADING_2),
        bodyText("Checks connectivity and model availability for the configured AI provider. Returns status and model information."),
        spacer(),

        heading("6.4 GET /api/transcribe (Preload)", HeadingLevel.HEADING_2),
        bodyText("Preloads the local Whisper model into memory on app startup, reducing first-transcription latency."),
        spacer(),

        // ═══ 7. SETTINGS & CONFIGURATION ═══
        new Paragraph({ children: [new PageBreak()] }),
        heading("7. Settings & Configuration"),
        bodyText("Settings are stored in localStorage under the key \"talky_provider_settings\" and persist across sessions via the fixed-port strategy."),
        spacer(),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2800, 2280, 4280],
          rows: [
            new TableRow({ children: [headerCell("Setting", 2800), headerCell("Default", 2280), headerCell("Options", 4280)] }),
            new TableRow({ children: [dataCell("AI Provider", 2800), codeCell("ollama", 2280), dataCell("groq, cerebras, ollama", 4280)] }),
            new TableRow({ children: [dataCell("Speech Engine", 2800), codeCell("whisper-local", 2280), dataCell("whisper-local, whisper-groq", 4280)] }),
            new TableRow({ children: [dataCell("Language", 2800), codeCell("auto", 2280), dataCell("auto, en (English), id (Indonesian)", 4280)] }),
            new TableRow({ children: [dataCell("Groq API Key", 2800), codeCell("(empty)", 2280), dataCell("User-provided API key for Groq services", 4280)] }),
            new TableRow({ children: [dataCell("Cerebras API Key", 2800), codeCell("(empty)", 2280), dataCell("User-provided API key for Cerebras", 4280)] }),
            new TableRow({ children: [dataCell("Ollama URL", 2800), codeCell("localhost:11434", 2280), dataCell("URL for local Ollama instance", 4280)] }),
            new TableRow({ children: [dataCell("Ollama Model", 2800), codeCell("llama3.2", 2280), dataCell("Any model installed in Ollama", 4280)] }),
          ],
        }),
        spacer(),

        // ═══ 8. TECH STACK ═══
        heading("8. Technology Stack & Dependencies"),
        spacer(),

        heading("8.1 Core Dependencies", HeadingLevel.HEADING_2),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3600, 2400, 3360],
          rows: [
            new TableRow({ children: [headerCell("Package", 3600), headerCell("Version", 2400), headerCell("Purpose", 3360)] }),
            new TableRow({ children: [codeCell("next", 3600), dataCell("16.1.6", 2400), dataCell("React framework + API routes", 3360)] }),
            new TableRow({ children: [codeCell("react", 3600), dataCell("19.2.3", 2400), dataCell("UI library", 3360)] }),
            new TableRow({ children: [codeCell("electron", 3600), dataCell("35.x", 2400), dataCell("Desktop shell", 3360)] }),
            new TableRow({ children: [codeCell("@xenova/transformers", 3600), dataCell("2.17.2", 2400), dataCell("Local Whisper model", 3360)] }),
            new TableRow({ children: [codeCell("tailwindcss", 3600), dataCell("4.x", 2400), dataCell("Utility-first CSS", 3360)] }),
            new TableRow({ children: [codeCell("electron-builder", 3600), dataCell("26.x", 2400), dataCell("App packaging (DMG)", 3360)] }),
          ],
        }),
        spacer(),

        heading("8.2 macOS Permissions", HeadingLevel.HEADING_2),
        bulletItem("NSMicrophoneUsageDescription: Microphone access for speech-to-text"),
        bulletItem("NSSpeechRecognitionUsageDescription: Speech recognition capability"),
        bulletItem("NSAppleEventsUsageDescription: Automation access for paste-to-app functionality"),
        spacer(),

        // ═══ 9. BUILD & DEPLOYMENT ═══
        new Paragraph({ children: [new PageBreak()] }),
        heading("9. Build & Deployment"),

        heading("9.1 Build Process", HeadingLevel.HEADING_2),
        numberedItem("Next.js builds to standalone server output"),
        numberedItem("Electron compiles TypeScript (main.ts + preload.ts) to dist-electron/"),
        numberedItem("electron-builder packages everything into a DMG for macOS arm64"),
        spacer(),

        heading("9.2 Build Commands", HeadingLevel.HEADING_2),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [4680, 4680],
          rows: [
            new TableRow({ children: [headerCell("Command", 4680), headerCell("Purpose", 4680)] }),
            new TableRow({ children: [codeCell("npm run dev", 4680), dataCell("Start development server", 4680)] }),
            new TableRow({ children: [codeCell("npm run build", 4680), dataCell("Build Next.js + Electron", 4680)] }),
            new TableRow({ children: [codeCell("npm run package:mac", 4680), dataCell("Package as DMG installer", 4680)] }),
          ],
        }),
        spacer(),

        heading("9.3 Distribution", HeadingLevel.HEADING_2),
        bulletItem("Output: release/ directory containing Talky DMG"),
        bulletItem("Architecture: arm64 (Apple Silicon)"),
        bulletItem("Icon: Custom 3D microphone icon (build/icon.icns)"),
        spacer(),

        // ═══ 10. FILE STRUCTURE ═══
        heading("10. File Structure"),
        spacer(),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [4200, 5160],
          rows: [
            new TableRow({ children: [headerCell("Path", 4200), headerCell("Description", 5160)] }),
            new TableRow({ children: [codeCell("electron/main.ts", 4200), dataCell("Electron main process: windows, shortcuts, IPC", 5160)] }),
            new TableRow({ children: [codeCell("electron/preload.ts", 4200), dataCell("Context bridge: exposes APIs to renderer", 5160)] }),
            new TableRow({ children: [codeCell("src/app/page.tsx", 4200), dataCell("Main expanded app window UI", 5160)] }),
            new TableRow({ children: [codeCell("src/app/island/page.tsx", 4200), dataCell("Dynamic Island overlay UI", 5160)] }),
            new TableRow({ children: [codeCell("src/hooks/useWhisperRecognition.ts", 4200), dataCell("PCM recording + silence detection hook", 5160)] }),
            new TableRow({ children: [codeCell("src/lib/settings.ts", 4200), dataCell("Settings types, storage, labels", 5160)] }),
            new TableRow({ children: [codeCell("src/components/SettingsPanel.tsx", 4200), dataCell("Full settings UI panel", 5160)] }),
            new TableRow({ children: [codeCell("src/app/api/transcribe/route.ts", 4200), dataCell("Dual-engine speech-to-text API", 5160)] }),
            new TableRow({ children: [codeCell("src/app/api/optimize/route.ts", 4200), dataCell("AI text transformation API", 5160)] }),
            new TableRow({ children: [codeCell("src/app/api/health/route.ts", 4200), dataCell("Provider health check API", 5160)] }),
            new TableRow({ children: [codeCell("electron-builder.yml", 4200), dataCell("Build configuration for electron-builder", 5160)] }),
            new TableRow({ children: [codeCell("build/icon.icns", 4200), dataCell("macOS application icon", 5160)] }),
          ],
        }),
        spacer(),

        // ═══ 11. KNOWN LIMITATIONS ═══
        heading("11. Known Limitations"),
        bulletItem("macOS only (arm64) \u2014 no Windows or Linux support in v1"),
        bulletItem("Local Whisper model requires ~145MB download on first use"),
        bulletItem("Ollama must be installed and running separately for local AI"),
        bulletItem("No conversation history or multi-turn context for transformations"),
        bulletItem("Clipboard-based paste may conflict with certain applications"),
        bulletItem("No auto-update mechanism \u2014 manual DMG installation required"),
        spacer(),

        // ═══ 12. VERSION HISTORY ═══
        heading("12. Version History"),
        spacer(),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1400, 1600, 6360],
          rows: [
            new TableRow({ children: [headerCell("Version", 1400), headerCell("Date", 1600), headerCell("Changes", 6360)] }),
            new TableRow({
              children: [
                dataCell("1.0", 1400, { bold: true }),
                dataCell("Mar 2026", 1600),
                dataCell("Initial release: Dictate + Transform modes, Dynamic Island UI, multi-provider AI (Groq/Cerebras/Ollama), dual speech engines (local Whisper + Groq Cloud), auto-stop on silence, system-wide paste, ESC to cancel, provider selector on island and main window, multi-language support (English + Indonesian), custom 3D microphone icon, fixed-port settings persistence.", 6360),
              ],
            }),
          ],
        }),
        spacer(),

        // ═══ 13. FUTURE ROADMAP ═══
        heading("13. Future Roadmap (v2)"),
        bodyText("The following improvements are planned for version 2:"),
        spacer(),
        infoBox("Status", "Version 2 development will begin after this documentation is finalized. Updates and new feature requirements will be shared separately."),
        spacer(),
        bodyText("Potential areas for v2 enhancement:"),
        bulletItem("Multi-turn conversation context for AI transformations"),
        bulletItem("Additional language support"),
        bulletItem("Windows / Linux cross-platform support"),
        bulletItem("Auto-update mechanism"),
        bulletItem("Custom prompt templates for frequent transformations"),
        bulletItem("Audio waveform visualization during recording"),
        bulletItem("Transcript history and search"),
        bulletItem("Hotword / wake word activation"),
        spacer(),
        spacer(),
        divider(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
          children: [new TextRun({ text: "End of Document \u2014 Talky v1.0 Product Documentation", font: "Arial", size: 20, color: MEDIUM, italics: true })],
        }),
      ],
    },
  ],
});

// ─── Generate ───
const outputPath = "/Users/rasyadgericko/Documents/RYC - Works/talky/Talky_v1_Product_Documentation.docx";
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputPath, buffer);
  console.log("Document created:", outputPath);
  console.log("Size:", (buffer.length / 1024).toFixed(1) + " KB");
});
