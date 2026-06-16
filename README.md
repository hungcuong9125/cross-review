# Review Weave

Review Weave is a professional desktop application designed to compile, merge, and distribute cross-review reports between QA teams or models.

## Core Purpose

For $N$ QA reports, Review Weave automatically processes and generates $N$ custom Markdown outputs. Each output file is tailored for a specific recipient QA team and contains reports from all *other* teams, excluding the recipient's own report. This facilitates objective, clean cross-review workflows.

**Example with 5 QA Teams:**
- `review-for-qa-1.md` $\rightarrow$ Contains reports from teams 2, 3, 4, 5.
- `review-for-qa-2.md` $\rightarrow$ Contains reports from teams 1, 3, 4, 5.
- `review-for-qa-3.md` $\rightarrow$ Contains reports from teams 1, 2, 4, 5.
- ...and so on.

## Key Features

1. **Left Sidebar Organization**: Clearly grouped into *Information Sources*, *Opening Components*, and *Closing Components*. Hovering over items reveals quick **Duplicate** and **Delete** actions.
2. **Active State Toggles**: Enable/disable individual reports or components. Disabled items are automatically excluded from the final exports and skipped during validation.
3. **Resizable Right Sidebar**: Drag the left border of the right sidebar to adjust the Markdown/HTML preview panel width (min 400px, max 50% of screen width).
4. **Bidirectional Selection Sync**: Clicking a source on the left sidebar automatically updates the preview target dropdown on the right, and vice versa.
5. **Text Preprocessing**:
   - **Cross-Review**: Toggle `Exclude Self` to hide the target report from its own preview (defaults to active).
   - **Normalize Whitespace**: Automatically collapses consecutive blank lines and trims text.
   - **Export as Single Line**: Flattens text into a single continuous line (removing heading hashes `#` and rules `---` to prevent global bolding issues) optimized for LLMs.
6. **Blank Startup State**: Launches clean with no demo data so you can start working on new projects immediately.

## Technology Stack

- **Backend**: Rust (Tauri 2 commands, validation engine, markdown exporter, file packaging)
- **Frontend**: React 19 + TypeScript + Vite 6
- **State Store**: Zustand 5
- **Styling**: Tailwind CSS / Vanilla CSS

## Prerequisites

- [Rust](https://rustup.rs/) (1.70+)
- [Node.js](https://nodejs.org/) (18+)
- [npm](https://www.npmjs.com/) (or pnpm/yarn)

## Development Guide

```bash
# Install dependencies
npm install

# Start the application in development mode
npm run tauri dev
```

## Production Building & Packaging

```bash
# Build and package for the current platform
npm run tauri build

# Cross-compilation for specific platforms
npm run tauri build --target x86_64-unknown-linux-gnu    # Linux
npm run tauri build --target x86_64-apple-darwin           # macOS Intel
npm run tauri build --target aarch64-apple-darwin           # macOS Apple Silicon
npm run tauri build --target x86_64-pc-windows-msvc         # Windows
```

Packaged installers (e.g. `.dmg` or `.app` on macOS, `.exe` or `.msi` on Windows) are written to `src-tauri/target/release/bundle/`.

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
    models.rs        # Data model definitions (Project, QaReport, Component...)
    validation.rs    # Data validation checks
    export.rs        # Markdown compile & merge logic
    slug.rs          # Unique file slug generator
    zip_export.rs    # ZIP packaging helper
    commands.rs      # IPC command registrations
  tauri.conf.json    # Tauri packaging and bundle configurations

src/
  App.tsx                # Main view & resizable sidebar logic
  main.tsx               # React entrypoint
  index.css              # Custom styling and markdown preview classes
  state/
    projectStore.ts      # Zustand state management
  lib/
    api.ts               # Rust command invocations
    i18n.ts              # English/Vietnamese language dictionaries
  components/
    Sidebar.tsx          # Resource lists, active states & quick actions
    EditorPanel.tsx      # Source, opening, and closing content editors
    PreviewPanel.tsx     # Live HTML/Markdown preview & stats footer
    Toolbar.tsx          # File I/O operations and exports
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

- [ ] **AI-Powered Summarization**: Integrate LLM capabilities to automatically rewrite, refine, or summarize source content.
- [ ] **Source Comparison Tool**: Add a comparison layout to highlight differences and analyze modifications between selected sources.

## License

This project is distributed under the MIT License.
