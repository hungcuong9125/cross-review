# QA Review Weaver

Desktop tool for generating and distributing cross-review markdown reports for QA models and teams.

## What it does

Given N QA reports, QA Review Weaver aggregates and splits reports to generate N markdown files — each file is tailored for a specific QA model or team and contains the reports of all *other* QA sources (excluding their own). This facilitates structured cross-review evaluation workflows across different QA models and agents.

**Example with 5 QA teams:**
- `review-for-qa-1.md` → contains reports from QA 2, 3, 4, 5
- `review-for-qa-2.md` → contains reports from QA 1, 3, 4, 5
- `review-for-qa-3.md` → contains reports from QA 1, 2, 4, 5
- ...and so on

## Tech Stack

- **Backend**: Rust (core logic, validation, export, file I/O)
- **Frontend**: React + TypeScript + Vite
- **Desktop**: Tauri 2
- **State**: Zustand
- **Styling**: Tailwind CSS

## Prerequisites

- [Rust](https://rustup.rs/) (1.70+)
- [Node.js](https://nodejs.org/) (18+)
- [pnpm](https://pnpm.io/) (8+)

## Development

```bash
# Install dependencies
pnpm install

# Run in dev mode
pnpm tauri dev

# Run Rust tests only
cd src-tauri && cargo test
```

## Build for Release

```bash
# Build for current platform
pnpm tauri build

# Build for specific platform (cross-compilation)
pnpm tauri build --target x86_64-unknown-linux-gnu   # Linux
pnpm tauri build --target x86_64-apple-darwin          # macOS Intel
pnpm tauri build --target aarch64-apple-darwin          # macOS Apple Silicon
pnpm tauri build --target x86_64-pc-windows-msvc        # Windows
```

The built application will be in `src-tauri/target/release/bundle/`.

## Project Structure

```
src-tauri/
  src/
    main.rs          # Tauri app entry point
    lib.rs           # Module declarations
    models.rs        # Data structures (Project, QaReport, ExportFile)
    validation.rs    # Project validation logic
    export.rs        # Markdown export generation
    slug.rs          # Filename slug generation
    zip_export.rs    # ZIP archive creation
    commands.rs      # Tauri command handlers

src/
  App.tsx                # Root layout with 3-panel design
  main.tsx               # React entry point
  index.css              # Tailwind + markdown styles
  state/
    projectStore.ts      # Zustand state management
  lib/
    api.ts               # Tauri invoke wrappers
  components/
    Sidebar.tsx          # QA team list
    EditorPanel.tsx      # Tabbed content editor
    PreviewPanel.tsx     # Markdown preview with stats
    Toolbar.tsx          # Top toolbar with actions
    ValidationChecklist.tsx  # Validation status display
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | New project |
| `Ctrl/Cmd + S` | Save project |
| `Ctrl/Cmd + O` | Open project |
| `Ctrl/Cmd + E` | Export all markdown files |
| `Ctrl/Cmd + Shift + C` | Copy current preview |

## File Format

Each exported markdown file follows this structure:

```markdown
{opening_text}

## Báo cáo từ {QA_NAME_1}

{report content}

---

## Báo cáo từ {QA_NAME_2}

{report content}

---

{closing_text}
```

## Sample

Load `sample-project.json` to see a demo with 5 QA teams.

## License

MIT
