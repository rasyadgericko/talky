<p align="center">
  <img src="https://github.com/rasyadgericko/talky/raw/main/build/icon.png" width="128" height="128" alt="Talky Icon" />
</p>

<h1 align="center">Talky</h1>

<p align="center">
  <strong>Speech-to-Text + AI Text Optimization for Desktop</strong><br/>
  Speak naturally, paste anywhere. Transform text with your voice.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/version-0.2.0-green" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-orange" alt="License" />
</p>

---

## What is Talky?

Talky is a lightweight desktop app that turns your voice into text and pastes it directly into any application. It floats as a compact island on your screen — press a shortcut, speak, and your words appear wherever your cursor is.

With the **Pro plan**, Talky also lets you select text in any app, speak an instruction (like "fix the grammar" or "summarize this"), and the AI-transformed result replaces your selection instantly.

## Features

### Dictate Mode
- Press **Alt+Space** to start recording
- Speak naturally — Talky transcribes your voice in real time
- Text is automatically pasted into your active application
- Works with any app: email, docs, Slack, code editors, browsers

### Transform Mode (Pro)
- Select text in any app, then press **Ctrl+I**
- Speak an instruction: *"make this more formal"*, *"summarize in 3 bullets"*, *"fix grammar"*
- AI transforms your selected text and replaces it in place
- Multi-turn conversation — refine results with follow-up instructions

### Floating Island UI
- Compact 340x56px bar that stays out of your way
- Expands for settings and onboarding
- Real-time waveform visualization while recording
- Mode indicators: blue for dictate, purple for transform

### Additional Features
- **15+ languages** supported with Groq Cloud (Pro)
- **Keyboard shortcuts** — fully customizable dictate and transform hotkeys
- **Sound feedback** — audio cues for start/stop/paste actions
- **Session stats** — track your words and sessions
- **Punctuation correction** — automatic cleanup of transcribed text
- **Conversation history** — browse past transcriptions and transforms

## Free vs Pro

| Feature | Free | Pro ($6/mo) |
|---|---|---|
| Transcription engine | Local Whisper (on-device) | Groq Cloud (fast, accurate) |
| Languages | English only | 15+ languages |
| Dictate mode | Yes | Yes |
| Transform mode (AI) | — | Yes |
| Monthly word limit | 5,000 words | Unlimited |
| Privacy | 100% offline | Cloud-processed |

## Installation

### Download

Go to the [**Releases**](https://github.com/rasyadgericko/talky/releases) page and download the latest `.dmg` (macOS) or `.exe` (Windows) file.

### macOS Setup

1. **Open the DMG** — double-click the downloaded `.dmg` file
2. **Drag to Applications** — move `Talky.app` into your `/Applications` folder
3. **First launch** — right-click the app and select "Open" (required for unsigned apps)
4. **Grant permissions** — Talky needs:
   - **Microphone** — to capture your voice
   - **Accessibility** — to paste text into other apps and capture selected text
5. **You're ready!** — Talky appears as a floating island on your screen

### Windows Setup

1. Run the `.exe` installer
2. Follow the installation wizard
3. Launch Talky from your Start Menu or Desktop shortcut

## How to Use

### Quick Start

1. **Open any app** where you want to type (email, doc, chat, etc.)
2. **Press Alt+Space** — Talky starts recording
3. **Speak** your text naturally
4. **Press Alt+Space again** (or click the mic) to stop
5. Your transcribed text is pasted automatically

### Transform Text (Pro)

1. **Select text** in any app
2. **Press Ctrl+I** — Talky captures your selection
3. **Speak your instruction**: *"make it shorter"*, *"translate to Spanish"*, *"fix the tone"*
4. **Press Ctrl+I again** to stop
5. The AI-transformed text replaces your selection

### Settings

Click the gear icon on the floating island to access:
- **Account** — sign in, view your plan, upgrade to Pro
- **Language** — choose transcription language (Pro: 15+ languages)
- **Shortcuts** — customize your dictate and transform hotkeys
- **Sounds** — toggle audio feedback on/off

## Tech Stack

- **Electron 35** — cross-platform desktop shell
- **Next.js 16** + **React 19** — UI framework
- **TypeScript** — type-safe codebase
- **Tailwind CSS v4** — styling
- **Supabase** — authentication and backend
- **Groq API** — cloud transcription (Whisper large-v3-turbo) and AI (Llama 3.3 70B)
- **@xenova/transformers** — local on-device Whisper (free tier)
- **Lemon Squeezy** — subscription payments

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
git clone https://github.com/rasyadgericko/talky.git
cd talky
npm install
```

### Commands

```bash
npm run dev              # Next.js dev server
npm run electron:dev     # Full Electron dev mode
npm run electron:build   # Build macOS DMG
npm run electron:build:win  # Build Windows installer
```

## License

MIT
