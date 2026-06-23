# Cross Review

![Cross Review Interface](./screenshot.png)

**Cross Review** is a lightweight desktop application designed to help QA teams and AI models easily cross-review each other's work. It supports AI-powered report consolidation using multiple LLM providers.

## How It Works

When multiple QA teams (or AI models) evaluate the same task, it's helpful to share their reports. However, you don't want a team to see their *own* report in the compiled feedback file.

Cross Review solves this by taking everyone's reports and generating customized files for each team automatically.

**For example, if you have 3 teams (Team A, Team B, Team C):**
- **Team A** receives a file containing reports from Team B & Team C.
- **Team B** receives a file containing reports from Team A & Team C.
- **Team C** receives a file containing reports from Team A & Team B.

## Key Features

- **AI-Powered Report Consolidation**: Automatically rewrite and deduplicate multiple QA reports into a single consolidated report using LLM providers (OpenAI, Anthropic, Gemini, DeepSeek, Xiaomi MiMo, OpenCode Go, Ollama, or any OpenAI-compatible endpoint).
- **Multi-Level Prompt System**: 4 prompt modes — Source-Preserved Summary, Unified Final Report, QA Review Handoff, or fully Custom Prompt.
- **Debug & Log Mode**: Inspect raw AI request/response payloads for troubleshooting provider integrations.
- **Simple Organization**: Neatly organize your information sources, opening notes, and closing notes in the left sidebar.
- **Quick Toggles**: Instantly enable or disable specific reports to include or exclude them from the final export.
- **Live Preview**: See exactly how the Markdown or HTML files will look for each recipient team in real-time.
- **Smart Text Processing**:
  - Automatically removes extra blank lines and trims text (`Normalize Whitespace`).
  - Flattens text into a single continuous line for feeding into LLMs (`Export as Single Line`).
  - Strip Non-Primary Script characters and Output Language options for AI output post-processing.
- **Import/Export Settings**: Save and restore all app settings (AI config, UI toggles) as JSON files.
- **Bilingual UI**: Full English and Vietnamese language support.
- **Offline & Fast**: Built with Rust and Tauri, meaning it's lightweight, secure, and works entirely offline.

## Prompt Modes

When using AI to generate consolidated reports, you can choose from 4 prompt modes in Settings:

| Mode | Name | Description |
|------|------|-------------|
| **Level 1** | Source-Preserved Summary | Keeps each source report as a separate section. Includes a comparison table. Best when you need to see what each team reported individually. |
| **Level 2** | Unified Final Report | Merges all sources into one deduplicated report with executive summary, findings, recommendations. Best for a single clean output. |
| **Level 3** | QA Review Handoff | Produces a structured handoff document for the next reviewer. Focuses on claims needing verification, files to inspect, and reproduction scenarios. |
| **Level 4** | Custom Prompt | Write your own system prompt. The textarea appears when this level is selected. |

**Default:** Level 2 (Unified Final Report).

Level 1–3 prompts are optimized for specific use cases and cannot be edited. Level 4 lets you fully customize the AI behavior.

## Supported AI Providers

Cross Review integrates with 8 LLM providers out of the box. Each provider has its own default endpoint and model list, which is automatically fetched when selected in the settings panel.

| Provider | Default Endpoint | Available Models |
|----------|-----------------|------------------|
| **Ollama** (default) | `http://localhost:11434/v1/` | User-dependent — any model pulled locally via `ollama pull <name>` |
| **OpenAI** | `https://api.openai.com/v1/` | `gpt-5.5`, `gpt-5.4`, `gpt-5.3` |
| **Anthropic** | `https://api.anthropic.com/v1/` | `claude-sonnet-4-6`, `claude-sonnet-4-5`, `claude-opus-4-8`, `claude-opus-4-7`, `claude-opus-4-6`, `claude-haiku-4-5` |
| **Gemini** | `https://generativelanguage.googleapis.com/v1/` | `gemini-3.5-flash`, `gemini-3.1-pro-preview` |
| **DeepSeek** | `https://api.deepseek.com/v1/` | `deepseek-v4-flash`, `deepseek-v4-pro` |
| **Xiaomi MiMo** | `https://api.xiaomimimo.com/v1/` | `mimo-v2.5`, `mimo-v2.5-pro` |
| **OpenCode Go** | `https://opencode.ai/zen/go/v1` | `deepseek-v4-flash`, `deepseek-v4-pro`, `glm-5`, `glm-5.1`, `glm-5.2`, `kimi-k2.5`, `kimi-k2.6`, `kimi-k2.7-code`, `mimo-v2.5`, `mimo-v2.5-pro`, `minimax-m2.7`, `minimax-m3`, `qwen3.5-plus`, `qwen3.6-plus`, `qwen3.7-max`, `qwen3.7-plus` |
| **OpenAI Compatible** | User-defined (required) | Free-text input — any model name |

**Notes:**
- All providers support configurable **base URL**, **API key**, and **model** overrides.
- **Thinking Mode** (Reasoning Effort) is supported for OpenAI, Anthropic, and Gemini; silently ignored by other providers.
- **OpenAI Compatible** requires a custom base URL and accepts any model name via free-text input.
- **Anthropic `/v1/messages` routing for proxy gateways**: Some API proxy gateways (like `openmodel.ai`) serve certain models (such as `deepseek-v4-flash`) exclusively through the Anthropic Messages API surface (`/v1/messages`) rather than the OpenAI-compatible `/v1/chat/completions` endpoint. To force the app to route requests to `/v1/messages` using the Anthropic messages format:
  1. Select **OpenAI Compatible** (to enable free-text model input).
  2. Set the **Base URL** to the proxy's API root (e.g., `https://api.openmodel.ai/v1`).
  3. Prefix the model name with `anthropic::` (e.g., `anthropic::deepseek-v4-flash`). The app will use the Anthropic adapter to format the request and strip the prefix before sending the payload.
- The default provider is **Ollama** (no API key required for local inference).

## Technology Stack

- **Backend**: Rust (Tauri 2 commands, validation engine, markdown exporter, file packaging)
- **Frontend**: React 19 + TypeScript + Vite 6
- **State Store**: Zustand 5
- **Styling**: Tailwind CSS / Vanilla CSS

## Prerequisites

- [Rust](https://rustup.rs/) (1.70+)
- [Node.js](https://nodejs.org/) (18+)
- [pnpm](https://pnpm.io/) (or npm/yarn)

## Development Guide

```bash
# Install dependencies
pnpm install

# Start the application in development mode
pnpm tauri dev
```

## Production Building & Packaging

```bash
# Build and package for the current platform
pnpm tauri build

# Cross-compilation for specific platforms
pnpm tauri build --target x86_64-unknown-linux-gnu       # Linux
pnpm tauri build --target x86_64-apple-darwin            # macOS Intel
pnpm tauri build --target aarch64-apple-darwin           # macOS Apple Silicon
pnpm tauri build --target x86_64-pc-windows-msvc         # Windows
```

Packaged installers (e.g. `.dmg` or `.app` on macOS, `.exe` or `.msi` on Windows) are written to `src-tauri/target/release/bundle/`.

## Linux Troubleshooting (DMA-BUF Rendering Issue)

If you run or install the application on Linux and it fails to open, crashes, or displays a blank window, this is usually caused by compatibility issues in WebKitGTK's DMA-BUF renderer (hardware acceleration) under certain graphics configurations (especially NVIDIA drivers or newer Intel graphics on Wayland/X11).

To resolve this issue, run the application with the `WEBKIT_DISABLE_DMABUF_RENDERER=1` environment variable to disable DMA-BUF rendering:

```bash
# For installed package (e.g. deb)
WEBKIT_DISABLE_DMABUF_RENDERER=1 cross-review

# For AppImage
WEBKIT_DISABLE_DMABUF_RENDERER=1 ./Cross-Review.AppImage
```

Alternatively, you can persist this configuration by adding the following line to your shell profile (e.g. `~/.bashrc`, `~/.zshrc`):
```bash
export WEBKIT_DISABLE_DMABUF_RENDERER=1
```

## Cleaning Build Cache & Application Data

Build files can consume significant disk space over time. Run these commands to reset the project and free up space:

```bash
# 1. Clean Rust cargo target build cache (can free up several gigabytes)
cargo clean --manifest-path src-tauri/Cargo.toml

# 2. Clean frontend build output and dev cache
rm -rf dist node_modules/.vite

# 3. Clean application webview data and saved drafts (macOS)
rm -rf ~/Library/WebKit/com.cross-review.app ~/Library/Caches/com.cross-review.app
rm -rf ~/Library/WebKit/cross-review ~/Library/WebKit/qa-cross-review ~/Library/Caches/cross-review ~/Library/Caches/qa-cross-review
```

## Directory Structure

```
src-tauri/
  src/
    main.rs          # Tauri app entrypoint
    lib.rs           # Module declarations
    models.rs        # Data model definitions (Project, QaReport, Component, AI types...)
    validation.rs    # Data validation checks
    export.rs        # Markdown compile & merge logic
    slug.rs          # Unique file slug generator
    zip_export.rs    # ZIP packaging helper
    commands.rs      # IPC command registrations
    ai.rs            # AI provider integration (genai client, rewrite, cancel)
  tauri.conf.json    # Tauri packaging and bundle configurations

src/
  App.tsx                # Main view, resizable sidebar, auto-save & keyboard shortcuts
  main.tsx               # React entrypoint
  index.css              # Custom styling and markdown preview classes
  state/
    projectStore.ts      # Zustand state management (tabs, AI config, content tabs)
  lib/
    api.ts               # Rust command invocations (project + AI IPC)
    i18n.ts              # English/Vietnamese language dictionaries
    sanitize.ts          # API key scrubbing for localStorage
  hooks/
    useToast.ts          # Toast notification system
  components/
    Sidebar.tsx          # Resource lists, active states & quick actions
    EditorPanel.tsx      # Source, opening, and closing content editors
    PreviewBody.tsx      # Live HTML/Markdown preview & stats
    ContentTabs.tsx      # Tab bar for preview + AI-generated reports
    SettingsPanel.tsx    # Settings (preview format, AI provider config, language)
    ToastHost.tsx        # Toast notification renderer
    Toolbar.tsx          # File I/O operations, tab routing & exports
```

## Keyboard Shortcuts

| Shortcut | Description |
|----------|-------------|
| `Ctrl/Cmd + N` | Create New Project |
| `Ctrl/Cmd + S` | Save Project File |
| `Ctrl/Cmd + O` | Open Project File |
| `Ctrl/Cmd + E` | Export All Markdown Files |

## Export Format Specification

The compiled Markdown outputs follow this structural convention:

```markdown
{Active Opening Components Content}

## 1. {Source Name 1}

{Source Content 1}

---

## 2. {Source Name 2}

{Source Content 2}

---

{Active Closing Components Content}
```


## Changelog

### v1.0.1 (2026-06-23) — Current

- **Refactored**: Extracted shared date/time formatting utilities (`pad`, `formatDateShort`, `formatTimeShort`) to `src/lib/utils.ts`, eliminating duplicate formatting logic between SettingsPanel and projectStore.
- **Refactored**: Simplified `desc.split("|")` pipe-highlighting JSX construction in GuideItems to a plain string render — removed ~13 lines of inline JSX.
- **Refactored**: Used direct string argument instead of function callback in `String.replace()` for import error alert placeholder.
- **Changed**: Narrowed `aiListModels` debounce effect dependencies — model list no longer refetched on API key input changes (only on provider kind and base URL changes).
- **Version**: Bumped to 1.0.1 (package.json, Cargo.toml, tauri.conf.json).

### v1.0.0 (2026-06-23)

- **Added**: Unified "Components" tab replacing separate "Opening" and "Closing" tabs — both sections now appear in a single panel with section headers, component counts, empty states, and dedicated add buttons.
- **Added**: Auto-scroll effect that smoothly scrolls to a component card when selected via `activeItem`.
- **Added**: New i18n translation keys for Components tab (`tab.components`, `editor.componentsCount`, `editor.noOpening`, `editor.addOpeningComponent`, `editor.noClosing`, `editor.addClosingComponent`).
- **Added**: New i18n translation keys for import/loading messages (`tab.importReport`, `tab.importSuccess`, `tab.importFail`, `tab.importFileInvalid`, `tab.debugEmpty`, `tab.copyDebug`).
- **Refactored**: Replaced all hardcoded `language === "vi" ? ... : ...` ternary expressions in ContentTabs with centralized `t()` calls for import, loading, and debug UI strings.
- **Refactored**: Extracted `renderComponentCard` function in EditorPanel for reusable component card rendering across opening/closing sections.
- **Refactored**: Consolidated `addComponent` and `selectComponent` store logic to always navigate to the "Components" tab.
- **Version**: Bumped to 1.0.0 (package.json, Cargo.toml, tauri.conf.json).

> For the complete version history, see [CHANGELOG.md](./CHANGELOG.md).

## Roadmap

- [x] **AI-Powered Summarization**: Integrate LLM capabilities to automatically rewrite, refine, or summarize source content.
- [ ] **Source Comparison Tool**: Add a comparison layout to highlight differences and analyze modifications between selected sources.

## License

This project is distributed under the MIT License.
