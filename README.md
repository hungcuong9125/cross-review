# Review Weave

![Review Weave Interface](./screenshot.png)

**Review Weave** is a lightweight desktop application designed to help QA teams and AI models easily cross-review each other's work.

## How It Works

When multiple QA teams (or AI models) evaluate the same task, it's helpful to share their reports. However, you don't want a team to see their *own* report in the compiled feedback file.

Review Weave solves this by taking everyone's reports and generating customized files for each team automatically.

**For example, if you have 3 teams (Team A, Team B, Team C):**
- **Team A** receives a file containing reports from Team B & Team C.
- **Team B** receives a file containing reports from Team A & Team C.
- **Team C** receives a file containing reports from Team A & Team B.

## Key Features

- **Simple Organization**: Neatly organize your information sources, opening notes, and closing notes in the left sidebar.
- **Quick Toggles**: Instantly enable or disable specific reports to include or exclude them from the final export.
- **Live Preview**: See exactly how the Markdown or HTML files will look for each recipient team in real-time.
- **Smart Text Processing**:
  - Automatically removes extra blank lines and trims text (`Normalize Whitespace`).
  - Flattens text into a single continuous line for feeding into LLMs (`Export as Single Line`).
- **Offline & Fast**: Built with Rust and Tauri, meaning it's lightweight, secure, and works entirely offline.

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
pnpm tauri build --target x86_64-unknown-linux-gnu    # Linux
pnpm tauri build --target x86_64-apple-darwin           # macOS Intel
pnpm tauri build --target aarch64-apple-darwin           # macOS Apple Silicon
pnpm tauri build --target x86_64-pc-windows-msvc         # Windows
```

Packaged installers (e.g. `.dmg` or `.app` on macOS, `.exe` or `.msi` on Windows) are written to `src-tauri/target/release/bundle/`.

## Linux Troubleshooting (DMA-BUF Rendering Issue)

If you run or install the application on Linux and it fails to open, crashes, or displays a blank window, this is usually caused by compatibility issues in WebKitGTK's DMA-BUF renderer (hardware acceleration) under certain graphics configurations (especially NVIDIA drivers or newer Intel graphics on Wayland/X11).

To resolve this issue, run the application with the `WEBKIT_DISABLE_DMABUF_RENDERER=1` environment variable to disable DMA-BUF rendering:

```bash
# For installed package (e.g. deb)
WEBKIT_DISABLE_DMABUF_RENDERER=1 review-weaver

# For AppImage
WEBKIT_DISABLE_DMABUF_RENDERER=1 ./Review-Weave.AppImage
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
rm -rf ~/Library/WebKit/com.review-weaver.app ~/Library/Caches/com.review-weaver.app
rm -rf ~/Library/WebKit/review-weaver ~/Library/WebKit/qa-review-weaver ~/Library/Caches/review-weaver ~/Library/Caches/qa-review-weaver
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

### v0.6.0 (2026-06-17)
- **Feature**: AI-Powered Report Consolidation — integrates LLM providers (OpenAI, Anthropic, Gemini, Deepseek, Groq, Cohere, xAI, Ollama, and any OpenAI-compatible endpoint) to automatically rewrite and deduplicate multiple QA reports into a single consolidated report.
- **Feature**: AI provider configuration panel — configure provider kind, base URL, API key, model, max input characters, and custom system prompt per project.
- **Feature**: AI connection testing — test provider connectivity and discover available models before saving.
- **Feature**: AI content tabs — generated reports open in dedicated tabs with HTML/Markdown preview, copy-to-clipboard, and tab management (close, close all).
- **Feature**: AI cancel support — cancel in-flight AI requests from the UI with backend CancellationToken integration.
- **Feature**: Toast notification system — non-blocking success/error/info toasts replace `alert()` for AI operations.
- **Feature**: API key security — keys are scrubbed from localStorage auto-save drafts, redacted in Rust Debug output and error messages, with a reload banner提醒 users to re-enter.
- **Fix**: `AiErrorCode` serialization mismatch — custom Serialize/Deserialize impls ensure tag strings match TypeScript's string-union type on the wire (critical for error switch-case handling).
- **Fix**: `cancel_in_flight()` race condition — token is now taken (not borrowed) from the global slot, preventing stale-token false positives on repeated cancel calls.
- **Fix**: Settings panel draft state sync — `useEffect` resets draft fields when `project.ai_config` changes (e.g., opening a different project file).
- **Fix**: `handleGenerate` double-click guard — added `if (aiBusy) return;` to prevent concurrent AI requests from React batching delays.
- **Fix**: QA target dropdown no longer navigates away from Home tab — uses `selectQaOnly()` instead of `selectQa()`.
- **Fix**: `max_input_chars` minimum floor raised from 0 to 1 to prevent instant InputTooLarge failures.
- **Fix**: `recordScrubIfNeeded` now checks the original project's API key presence instead of the sanitized draft, eliminating false "key missing" banners for providers without keys.
- **Fix**: Content tabs WYSIWYG — display now applies `processContent()` (compactMode, removeWhitespace, mergeLines) to match what gets copied to clipboard.
- **Fix**: Cancellation tests no longer share global `OnceLock` state — `cancel_in_flight()` take() pattern eliminates parallel test flakiness.
- **Chore**: Removed dead `clear_cancel()` function and `PreviewPanel.tsx` (replaced by `PreviewBody.tsx`).
- **Chore**: Fixed `.gitignore` typo (`upstrems` → `upstreams`).
- **Tech**: Added `genai` 0.6.5, `tokio`, `tokio-util` Rust dependencies for LLM provider abstraction.

### v0.5.6 (2026-06-16)
- **Security**: Narrowed filesystem permission scope from `**` (entire filesystem) to `$HOME/$DESKTOP/$DOCUMENT/$DOWNLOAD`.
- **Fix**: `mergeLines` content processing no longer corrupts fenced code blocks — tracks ` ``` `/`~~~` state and skips heading/rule stripping inside blocks.
- **Fix**: `removeAllQa` now preserves component selection when deleting all QA reports (components are not deleted).
- **Fix**: `migrateProject` uses `maxOrder + 1` instead of hardcoded `0` for migrated component order, preventing order collisions.
- **Fix**: Save/Export dialog filenames now sanitize filesystem-hostile characters (`/`, `:`, `*`, `?`, `<>`, `|`).
- **Fix**: `generate_preview` now checks `target.active` — consistent with `generate_exports` which skips inactive targets.
- **Fix**: `exportAllZip` success alert now shows actual output path returned from backend instead of user-selected input path.
- **Fix**: ZIP export creates missing parent directories and cleans up partial files on error.
- **Fix**: Removed redundant `project.exclude_self` from `refreshPreview` dependency array.
- **Chore**: Removed 6 unused translation keys (`preview.info`, `preview.excluded`, `preview.excludedEnd`, `settings.title`, `settings.removeWhitespaceDesc`, `settings.mergeLinesDesc`).
- **Chore**: Removed redundant JSX comments from EditorPanel.
- **Chore**: Simplified `generate_filename` by removing redundant unnamed-input check in slug module.

### v0.5.5 (2026-06-16)
- **Security**: Enabled Content Security Policy in Tauri config — restricts script/style/connect sources.
- **Fix**: Auto-save draft no longer overwrites loaded project on mount (added `draftLoaded` ref guard).
- **Fix**: `refreshValidation` race condition — stale async IPC responses are now discarded via generation counter.
- **Fix**: Preview panel now refreshes when `exclude_self` toggle changes (missing `useCallback` dependency).
- **Fix**: `marked()` call replaced with `marked.parse()` for reliable synchronous return type.
- **Fix**: `execCommand("copy")` fallback now checks return value and only shows "Copied!" on success.
- **Fix**: `handleExportAll` now shows alert on validation failure, matching Toolbar behavior.
- **Fix**: `removeAllQa` no longer forces tab switch to "opening" — user stays on current tab.
- **Fix**: `compactMode` no longer destroys paragraph breaks needed by `mergeLines` (skip when mergeLines is active).
- **Fix**: `moveComponentUp/Down` sort is now deterministic with `id` tiebreaker for equal-order components.
- **Fix**: `migrateProject` no longer bakes language into component names — uses neutral "Opening"/"Closing".
- **Fix**: Inconsistent spacing in duplicate-name validation warning (`Source # {}` → `Source #{}`).
- **Fix**: Vietnamese slug test strengthened — now asserts diacritics preservation with descriptive error messages.
- **Refactor**: Extracted `SidebarItem`, `CopyIcon`, `DeleteIcon` components — eliminated ~72 lines of triplicated JSX.
- **Chore**: Removed unused `migration.opening` / `migration.closing` translation keys.

### v0.5.4 (2026-06-16)
- **Fix**: Replaced hardcoded text in settings panel title with `t()` translation function.
- **Fix**: Fixed empty-check fallback on copy: if duplicating an unnamed QA, ensure it appends the copy suffix properly (`qa.name ? ... : copySuffix`).
- **Fix**: Simplified state toggles (`active`, `exclude_self`) in project store.
- **Fix**: Added missing `refreshValidation` calls after moving components up or down.
- **Fix**: Refactored component filtering logic in Rust backend.
- **Fix**: Added drag listener cleanup on window unmount to prevent memory leaks.
- **Fix**: Migrated projects now correctly inherit the active store language context.
- **Fix**: Legacy project fields (`opening_text`, `closing_text`) are cleared on migration to prevent redundant serialization.
- **Fix**: Fixed fallback component naming on copy (`comp.name ? ... : copySuffix`).
- **Fix**: Enhanced validation logging by replacing raw IDs with human-readable index labels (e.g. `Source #N`) in the local validation fallback, and log IPC errors.
- **Improvement**: Replaced redundant comments and dead code in state management.
- **Improvement**: Added translation configuration and confirmation alert before removing all QA reports (`removeAllQa`).

### v0.5.3 (2026-06-16)
- **Fix**: `mergeLines` paragraph separator ` | ` never being inserted — the empty-line filter was destroying paragraph break information before the regex could match.
- **Fix**: `removeQa` and `removeEmptyQa` destroying component selection when deleting a non-selected QA report.
- **Fix**: Validation error label showing raw whitespace for whitespace-only QA names instead of `Source #N`.
- **Fix**: Missing `refreshValidation` calls in `updateComponentName` and `addComponent`.
- **Fix**: Removed unreachable dead code in `migrateProject` guard.
- **Fix**: Capped `to_slug` length to 200 characters to prevent exceeding filesystem filename limits.
- **Fix**: Translation fallback operator `||` changed to `??` — empty strings no longer fall through to Vietnamese.
- **Fix**: Added `Array.isArray` validation for localStorage draft to prevent crash on corrupted data.
- **Improvement**: Replaced all hardcoded English/Vietnamese strings with `t()` translation calls.
- **Improvement**: Duplicate suffix now uses `t("suffix.copy", language)` instead of hardcoded Vietnamese `(bản sao)`.

### v0.5.2 (2026-06-16)
- **Security**: Fixed XSS vulnerability — added DOMPurify sanitization for `dangerouslySetInnerHTML` in preview panel.
- **Fix**: JS fallback validation now counts only active reports, matching Rust backend behavior.
- **Fix**: `duplicateQa` now preserves the `active` field from the source QA report.
- **Fix**: `removeComponent` and `duplicateComponent` now trigger validation refresh.
- **Fix**: `migrateProject` now deep-copies the components array to prevent mutation side effects.
- **Fix**: Added error alerts for keyboard shortcuts (Ctrl+S/O/E) matching toolbar button behavior.
- **Fix**: Added `try-catch` around `localStorage.setItem` to handle quota exceeded errors.
- **Fix**: Added `IoError` variant to `ExportError` enum for proper filesystem error categorization.
- **Fix**: ZIP export now uses `IoError` instead of `ValidationFailed` for I/O errors.

### v0.5.1 (2026-06-16)
- **Chore**: Renamed application from "QA Review Weaver" to "Review Weave".
- **Style**: Refined preview panel header element layout and synchronization.
- **Improvement**: Updated translations and set English as the default application language.
- **Chore**: Cleaned up `.gitignore`, untracked cached files.

### v0.5.0 (2026-06-16)
- **Feature**: Implemented resizable right sidebar — drag the left border to adjust preview panel width.
- **Feature**: Added left sidebar toggle for showing/hiding the sidebar.
- **Feature**: Added component actions — duplicate, delete, and reorder (move up/down) for opening/closing sections.
- **Feature**: Default empty state display when no sources or components exist.

### v0.4.0 (2026-06-16)
- **Feature**: Added `exclude_self` cross-review option to filter out the target QA report from its own compiled preview/export.
- **Feature**: Configured blank initial state in Tauri backend — new projects start clean with no demo data.

### v0.3.0 (2026-06-16)
- **Improvement**: Extended project title input area.
- **Feature**: Added HTML/Markdown preview toggle in the preview panel.
- **Fix**: Moved HTML/MD toggle to its own row below the stats grid for better layout.

### v0.2.0 (2026-06-16)
- **Feature**: Major UI/feature refactor — introduced reusable components system (opening/closing sections).
- **Feature**: Added internationalization (Vietnamese/English) with full translation support.
- **Feature**: Added settings panel with compact mode, whitespace normalization, and merge lines options.
- **Improvement**: Tab-based navigation moved to toolbar (Reports, Opening, Closing).
- **Improvement**: Unified sidebar with QA reports and components grouped together.
- **Improvement**: Pill-style tabs design and sidebar badges.

### v0.1.0 (2026-06-15)
- **Release**: Initial release of Review Weave desktop application.
- **Feature**: QA report management with cross-review generation.
- **Feature**: Multi-format exports — Markdown folder and ZIP archiving.
- **Feature**: Text pre-processors — normalize whitespace, export as single line.
- **Feature**: Live Markdown/HTML preview with character and word count.
- **Tech Stack**: Rust (Tauri 2) + React 19 + TypeScript + Zustand 5.

## Roadmap

- [x] **AI-Powered Summarization**: Integrate LLM capabilities to automatically rewrite, refine, or summarize source content.
- [ ] **Source Comparison Tool**: Add a comparison layout to highlight differences and analyze modifications between selected sources.

## License

This project is distributed under the MIT License.
