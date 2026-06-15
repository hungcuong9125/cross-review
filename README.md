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

### v1.1.0 (2026-06-15)
- **Feature**: Added `exclude_self` cross-review option to filter out the target QA report from its own compiled preview/export.
- **Feature**: Implemented resizable right sidebar for flexible Markdown/HTML preview panels.
- **Feature**: Added toggle switch and quick Duplicate/Delete actions for all sources and components.
- **Feature**: Enabled bidirectional selection sync between the left sidebar item list and the preview target dropdown.
- **Feature**: Blank initial state upon starting new projects.
- **Optimization**: Set English as the default application language.
- **Optimization**: Synchronized and perfected heights of target selection bar elements in `PreviewPanel` to `34px`.

### v1.0.0 (2026-05-31)
- **Release**: First major stable release of Review Weave.
- **Feature**: Implemented multi-format exports including Markdown folder and ZIP archiving.
- **Feature**: Added text pre-processors (Normalize whitespace, Export as single line).

## Roadmap

- [ ] **AI-Powered Summarization**: Integrate LLM capabilities to automatically rewrite, refine, or summarize source content.
- [ ] **Source Comparison Tool**: Add a comparison layout to highlight differences and analyze modifications between selected sources.

## License

This project is distributed under the MIT License.
