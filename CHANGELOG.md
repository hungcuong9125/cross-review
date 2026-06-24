# Changelog

All notable changes to CrossReview are documented in this file.

### v1.0.4 (2026-06-24)

- **Fixed**: `debugEnabled` setting is now fully restored on app launch — previously saved to `localStorage` but never read back on restart.
- **Fixed**: `previewFormat` validation during settings restore now only accepts `"html"` or `"markdown"` (was any string, allowing invalid values to slip through).
- **Fixed**: Model list now refreshes when API key changes for providers that require one — `draftApiKey` added to model-fetch effect dependencies in SettingsPanel.
- **Fixed**: Debug tab titles now correctly display dates for Rust epoch-second timestamps (e.g. `"1750732800"`) — added `parseDebugTimestamp()` helper in `src/lib/utils.ts` that distinguishes seconds from milliseconds and falls back to `new Date()` for invalid input.
- **Fixed**: Switching tabs no longer resets `activeContentTabId` when leaving Debug if the user was viewing a non-debug tab (e.g. a preview tab); only resets when actually viewing a debug-kind content tab.
- **Refactored**: Settings restore now applies all changes in a single `useProjectStore.setState()` call instead of 6 separate calls, reducing re-renders at startup.
- **Improved**: `console.warn` for invalid saved settings JSON in `localStorage`, replacing the previously silent `catch {}`.
- **Improved**: `setTimeout` handle in settings-restore `useEffect` is now saved and cleaned up via the effect's return function, preventing leaked timers under React 19 StrictMode.
- **Version**: Bumped to 1.0.4 (package.json, Cargo.toml, tauri.conf.json).

### v1.0.3 (2026-06-24)

- **Fixed**: Settings (dark mode, language, compact mode, remove whitespace, merge lines, debug enabled, preview format) now persist across app restarts via `localStorage` auto-save with 500ms debounce — previously all settings reset to defaults on every launch.
- **Fixed**: Debug tab titles now show only date and time (`Debug MM/DD HH:MM`) without the provider/model name, both for newly created and loaded tabs.
- **Fixed**: Switching from the Debug tab to the Home tab after an AI error no longer leaves the debug content stuck in the content area — `activeContentTabId` is now properly reset to `"preview"` when navigating away from debug.
- **Version**: Bumped to 1.0.3 (package.json, Cargo.toml, tauri.conf.json).

### v1.0.2 (2026-06-24)

- **Fixed**: Removed the AI model name from the Debug tab titles in the UI, keeping only the provider name (and timestamp for new logs) for cleaner identification.
- **Changed**: Increased the AI request (rewrite/generation) timeout from 120 seconds to 600 seconds (10 minutes) to prevent premature timeout failures for slow reasoning models (e.g. minimax-m3 with thinking enabled).
- **Version**: Bumped to 1.0.2 (package.json, Cargo.toml, tauri.conf.json).

### v1.0.1 (2026-06-23)

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

### v0.9.5 (2026-06-21)

- **Added**: Per-source exclusion in AI rewrite — frontend passes `selectedQaId` to Rust backend, enabling targeted source exclusion from the consolidated report.
- **Added**: Default base URLs for each provider — provider dropdown auto-fills the correct default URL on selection switch.
- **Added**: `exclude_self` setting now included in settings export/import round-trip.
- **Added**: `PROVIDERS_NEEDING_API_KEY` set — API-key-missing warning banner only shows for providers that actually require one (no false positive for Ollama).
- **Fixed**: `opencodego` base URL missing trailing slash (`/v1` → `/v1/`), which could produce malformed concatenated API URLs.
- **Fixed**: Error type guard in `handleGenerate` — proper fallback with `toastError(String(err))` for non-`AiErrorPayload` exceptions.
- **Fixed**: Model selection no longer unnecessarily cleared when switching between compatible providers; only cleared when switching to/from `openaicompatible`.
- **Fixed**: Settings Quick Guide pipe rendering — `desc.split("|")` now handles any number of pipe characters instead of silently dropping content after the second pipe.
- **Fixed**: Consolidated multiple redundant `useProjectStore.getState()` calls into a single store snapshot in `handleGenerate`.
- **Changed**: AI report title now uses language-aware date format (`vi`: dd/MM, `en`: MM/dd) instead of hardcoded en-GB locale.
- **Changed**: Debug tab title now shows date/time + `provider/model` for clearer tab identification.
- **Changed**: Debug tab close-all button now visible with 1+ tabs (was 2+), uses i18n title string.
- **Changed**: Settings checkboxes reorganized — "Exclude current source" moved to processing column, "Enable debug" uses i18n translation key.
- **Changed**: Base URL input placeholder now dynamic per provider kind.
- **Refactored**: Settings Quick Guide from hardcoded bilingual JSX to data-driven i18n-powered component via `GUIDE_ITEMS` array.
- **Docs**: Added Anthropic `/v1/messages` routing instructions for proxy gateways (e.g., `openmodel.ai`).
- **Version**: Bumped to 0.9.5 (package.json, Cargo.toml, tauri.conf.json).

### v0.9.4 (2026-06-21)

- **Added**: Settings Quick Guide panel in SettingsPanel — bilingual English/Vietnamese descriptions for each toggle (cross-review, compact mode, normalize whitespace, export as single line, enable debug, strip non-primary, output language).
- **Changed**: Updated screenshot from `81905.png` to `screenshot.png`.
- **Fixed**: Vietnamese translation for "Strip Non-Primary Script" — changed from "Xoá ký tự ngoài ngôn ngữ chính" to "Loại bỏ ký tự ngoại lai" for better clarity.
- **Refactored**: Improved SettingsPanel layout — replaced `<hr>` separator with padding classes for consistent spacing; reformatted debug modal conditional rendering block.
- **Removed**: Old screenshot `81905.png`.
- **Version**: Bumped to 0.9.4 (package.json, Cargo.toml, tauri.conf.json).

### v0.9.3 (2026-06-20)

- **Rebrand**: Renamed entire project from "Review Weave" to "Cross Review" — package name changed from `review-weaver` to `cross-review`, binary/lib renamed to `cross_review_lib`, app identifier updated to `com.cross-review.app`, and all UI/product references updated accordingly.
- **Changed**: Updated all troubleshooting commands, cleaning paths, and CSP references to use the new `cross-review` binary name and `com.cross-review.app` identifier.
- **Refactored**: Moved changelog from README.md to dedicated CHANGELOG.md — README now keeps only the last 2 entries.
- **Docs**: Updated all code references in `index.html`, tooltips, error messages, and system prompts to reflect the new name.

### v0.9.2 (2026-06-20)
- **Breaking**: Renamed `remove_chinese` to `strip_non_primary` -- now strips all non-primary script characters (CJK, Cyrillic, Arabic, Thai, Devanagari, etc.) via auto-detection instead of only Chinese. Latin characters are always preserved.
- **Breaking**: Renamed `translate_vietnamese` to `output_language` (string) -- supports 14 output languages (vi, en, zh, ja, ko, ru, fr, de, es, pt, it, th, ar, hi) with parameterized CRITICAL instructions. Empty value or "en" means no translation.
- **Changed**: Settings UI now shows a language dropdown (14 options) instead of a Vietnamese checkbox, and a renamed "Strip Non-Primary Script" checkbox.
- **Changed**: `strip_chinese()` replaced with `strip_non_primary_scripts()` using Unicode block auto-detection for primary script identification.
- **Changed**: `prepend_vietnamese_instruction()` replaced with `prepend_language_instruction()` accepting a language code parameter.
- **Changed**: `resolve_prompt()` now handles all 14 output languages with proper prompt sentence replacement and CRITICAL instruction prepending.
- **Changed**: `build_chat_request()` critical instruction broadened from "Do NOT output Chinese" to "Do NOT output any non-primary script characters".
- **Added**: `language_name()` helper mapping language codes to English names.
- **Added**: Comprehensive test coverage for strip_non_primary_scripts (auto-detect Latin primary, Cyrillic primary, mixed CJK-Latin primary, Latin always kept) and output_language (all 14 langs + empty passthrough + English passthrough).
- **Updated**: All i18n keys (`settings.removeChinese` → `settings.stripNonPrimary`, `settings.translateVietnamese` → `settings.outputLanguage` + `settings.outputLanguage.chooseLanguage`).
- **Fixed**: Vietnamese-only error messages in `open_project` and `import_settings_cmd` — now include English fallback for non-Vietnamese users.
- **Fixed**: `refreshValidation` fires an IPC call on every keystroke without debounce — added 200ms debounce timer to coalesce rapid mutations.
- **Fixed**: `listModels` effect re-fetches model list when `draftMaxChars` changes (irrelevant dependency) — removed from dependency array.
- **Fixed**: `migrateProject` creates components without explicit `active` field — now sets `active: true` for consistency with `addComponent`.
- **Refactored**: Removed overly verbose explanatory comments from `strip_non_primary_scripts` and `detect_primary_script`.
- **Refactored**: Removed stale `screenshot-v2.png`, replaced with updated screenshot.

### v0.9.0 (2026-06-20)
- **Added**: Custom opening/closing components now included in AI consolidation request body (`build_chat_request`) — user-authored component text is placed before sources (opening) and after sources (closing) with section separators.
- **Added**: Vietnamese prompt enhancement — when translation is enabled, English output-language lines inside the prompt are now replaced with Vietnamese equivalents (beyond just prepending the CRITICAL instruction).
- **Added**: `remove_chinese` critical instruction block appended to AI requests when the setting is active.
- **Added**: Debug logs persistence — debug logs are now automatically saved inside the `.cross-review.json` project file and fully restored upon opening; new debug tab management (append, close individual, close all) with `DebugLog` reference tracking in project state.
- **Added**: Multi-entry ZIP export (`export_multiple_to_zip`) replacing single-file ZIP — export all AI/preview tabs as a single archive with collision-safe filenames.
- **Added**: Source-level export buttons in sidebar — export the selected source as a standalone `.md` file or all active sources as a `.zip` archive.
- **Added**: Debug log export — export the active debug tab's request/response as a standalone Markdown file.
- **Added**: Loading spinner and overlay components (`LoadingSpinner`, `LoadingOverlay`) extracted and reused across AI request and report-generation views.
- **Added**: `closeAllDebugTabs` action in project store — closes all debug tabs and clears debug logs from project state in one operation.
- **Added**: `ZipEntry` model for Tauri IPC serialization of multi-entry ZIP exports.
- **Added**: i18n keys for new UI strings (`dialog.noSource`, `footer.exportAllZip`, `loading.aiRequest`, `loading.generatingReport`).
- **Fixed**: Source ZIP export (`handleExportSourceZip`) now includes the cross-review signature — was inconsistent with the `.md` export path which always appended `SIGNATURE`.
- **Fixed**: "Export All ZIP" (`handleExportAllTabsZip`) now regenerates preview content fresh via `generatePreview()` instead of reading the potentially stale cached `previewMarkdown` store value.
- **Fixed**: Debug tab "Close all" button now correctly calls `closeAllDebugTabs` (was incorrectly calling `closeAllAiTabs`).
- **Fixed**: AI tab content now renders `processedContent` via `useMemo` consistently — the raw `tab.markdown` variable was accidentally passed through to `marked.parse` in one code path.
- **Fixed**: `closeAllAiTabs` no longer clears `debug_logs` project state when only AI tabs are being closed.
- **Fixed**: `newProject` no longer redundantly overrides fields that already match `DEFAULT_PROJECT` defaults.
- **Changed**: `build_chat_request` function signature expanded — now accepts `project`, `cfg` parameters; body construction includes opening components, source sections, optional critical instructions, and closing components.
- **Changed**: `get_components` visibility broadened to `pub(crate)`; new `estimate_components_chars` helper added for more accurate capacity estimation in AI requests.
- **Changed**: `export_single_zip` Tauri command replaced by generalized `export_multiple_zip` accepting an array of `ZipEntry` structs.
- **Changed**: Unified `exportTab(mode)` callback replaced by separate named export handlers (`handleExportTabMd`, `handleExportSourceMd`, `handleExportSourceZip`, `handleExportAllTabsZip`, `handleExportDebugLog`) for clearer responsibility boundaries.
- **Changed**: `isValidMarkdownReport` import moved from dynamic (`await import(...)`) to static top-level import.
- **Changed**: Loading overlay DOM inlined in both AI and debug views replaced by shared `LoadingOverlay` component.
- **Removed**: `handleExportMd`/`handleExportZip` export handlers and the underlying `exportTab(mode)` abstraction.
- **Removed**: Dead `displayContent` intermediate variable in `PreviewBody`.
- **Removed**: Verbose explanatory comment and unused variable in Vietnamese prompt test.
- **Tests**: Added `test_resolve_prompt_vietnamese_replaces_english_line` covering all 3 prompt levels.
- **Tests**: Updated test `Project` fixture construction in `ai.rs` and `export.rs` to include new `debug_logs: None` field.
- **Version**: Bumped to 0.9.0 (package.json, Cargo.toml, tauri.conf.json).

### v0.8.2 (2026-06-20)
- **Fixed**: `isValidMarkdownReport` was over-permissive — a bare signature comment or stray `**` passed validation. Replaced with stricter `REVIEW_REPORT_SIGNATURE` regex requiring `## N.` section headers. Split into `isValidSourceDocument` for source document imports (accepts any non-empty text) and `isValidMarkdownReport` for AI report imports (requires Cross Review report structure).
- **Fixed**: `BINARY_BYTES` regex included `\xFF` (0xFF, matching valid Latin-1 character `ÿ`) — removed to avoid rejecting legitimate international text. Binary check window increased from 1000 to 4096 chars.
- **Fixed**: `handleImportReport` passed `initialCharCount: 0` for imported reports — now passes `content.length` so the "Initial Characters" tile and percent-change badge work correctly.
- **Fixed**: `handleExportSettings` omitted `translate_vietnamese` and `remove_chinese` from the exported settings payload — settings round-trip silently reset both toggles to false.
- **Fixed**: `open_project` legacy validation accepted any JSON with a non-empty `title` field — tightened to require non-empty `qa_reports` or `components`.
- **Fixed**: `import_settings_cmd` legacy validation rejected default settings files (all flags off, no AI config) — now accepts any valid JSON matching the `AppSettings` schema.
- **Fixed**: `PreviewBody` displayed raw (unprocessed) markdown while the "Remaining characters" label and percent-change badge reflected processed content — now renders processed content consistently.
- **Fixed**: `processContent` re-ran on every render in `PreviewBody` and `AiTabContent` — wrapped in `useMemo` with proper dependency arrays.
- **Refactored**: `closeContentTab` dual return path flattened into a single `Partial<ProjectState>` object with conditional `ai_reports` mutation.
- **Removed**: Dead `exportAllMarkdown`/`exportAllZip` Tauri commands, their Rust handlers, TS API wrappers, and the underlying `export_to_zip` function (~80 lines of dead code).
- **Removed**: Excessive explanatory comments in `projectStore.ts` (fenced code block tracking, empty-line stripping, debug view fallback).
- **Tests**: Fixed `Project` test fixture construction in `ai.rs` and `export.rs` to include new `document_type` and `ai_reports` fields.
- **Version**: Bumped to 0.8.2 (package.json, Cargo.toml, tauri.conf.json).

### v0.8.1 (2026-06-19)
- **Fixed**: `isValidMarkdownReport` `BINARY_BYTES` regex was matching the Combining Diacritical Marks Unicode block (U+0300–U+036F) instead of ASCII control bytes — Vietnamese/accented text was being rejected as binary, while real binary content (NUL, etc.) slipped past the check. Now uses proper `[\x00-\x08\x0E-\x1F\x7F\xFF]` escape sequence.
- **Fixed**: `isValidMarkdownReport` `MARKDOWN_STRUCTURE` regex now matches lists at the start of content (added `(^|\n)` anchor) — reports that begin with `- item` were previously rejected.
- **Fixed**: Imported reports no longer show a fake "0% change" percent indicator — `appendAiTab` now passes `initialCharCount: 0` for imports and the "Initial Characters" cell renders `—` when no baseline is available.
- **Fixed**: `setTimeout` in `handleCopy` was leaking on unmount — now stored in `copyTimerRef` and cleared in a `useEffect` cleanup.
- **Refactored**: Extracted `toSlug` helper to `src/lib/slug.ts` and `percentChange` helper to `src/lib/utils.ts` — eliminated triplicated slug logic from `App.tsx`, `Toolbar.tsx`, `SettingsPanel.tsx`, and inline percent calculation from `ContentTabs.tsx`/`PreviewBody.tsx`.
- **Refactored**: Unified `handleExportMd` and `handleExportZip` into a single `exportTab(mode)` callback with `useCallback` wrappers — eliminated ~80 lines of duplicated export logic.
- **Refactored**: Hoisted `BINARY_BYTES` and `MARKDOWN_STRUCTURE` regexes to module scope (no per-call `new RegExp` allocation).
- **Changed**: Renamed `handleExportAllRef` to `handleExportMdRef` in `App.tsx` to match its actual semantics (the ref points only to the MD export, not a combined ZIP+MD action).
- **Changed**: Moved the `import` of `percentChange` to the top of `ContentTabs.tsx` and `PreviewBody.tsx` to satisfy ESM module hoisting conventions.
- **Removed**: Excessive explanatory JSX/TS comments across all components and the project store (~120 lines).
- **Removed**: Whitespace-only changes in `src-tauri/src/commands.rs` (trailing spaces on blank lines).
- **Version**: Bumped to 0.8.1 (package.json, Cargo.toml, tauri.conf.json).

### v0.8.0 (2026-06-19)
- **Feature**: AI report tabs persistence — generated AI reports are now automatically saved inside the `.cross-review.json` project file and fully restored upon opening.
- **Feature**: "Import report" button — load external Markdown (`.md`) reports directly into new AI tabs from the Home tab bar.
- **Feature**: Validation checks for imports — added validation rule (`isValidMarkdownReport`) to check extension, verify signature, identify legacy exports, and strip binary garbage for both report and source document imports.
- **Feature**: Project and Settings file verification — added JSON signature validation to protect Open Project and Import Settings actions from loading invalid or unrelated files.
- **Fixed**: Target `None` select sources bug in Rust backend — when Cross review is active, generating consolidated reports (with no specific target) now correctly selects all active sources instead of returning an empty list.
- **Changed**: Reorganized settings panel — added horizontal separator and divided options into two distinct columns: `DISPLAY SETTINGS` (Cross review, Compact mode, Normalize whitespace, Export as single line) and `PROCESSING SETTINGS` (Enable debug, Remove Chinese, Translate Vietnamese).
- **Changed**: Formatting scope isolation — `Compact mode`, `Normalize whitespace`, and `Export as single line` options now only affect Copy to clipboard and Export file processes, leaving the on-screen Markdown and HTML views clean.
- **Changed**: Professional save filename convention — default file name generation converts project title to slug format, preserving letters and removing diacritics instead of forcing lowercase.
- **Changed**: Renamed buttons for clarity — changed toolbar options to "New project", "Open project", "Save project", and tab actions to "Close all tabs".
- **Version**: Bumped to 0.8.0.

### v0.7.0 (2026-06-19)
- **Security**: AI response and error messages now scrubbed via `scrub_api_key()` to prevent API key leakage in debug logs
- **Fixed**: `select_sources()` with `exclude_self=true` and no target now correctly returns empty sources (consistent with target-filtered behavior)
- **Fixed**: Keyboard shortcut stale-closure bug — handlers moved to refs (`handleSaveRef`, `handleOpenRef`, `handleExportAllRef`) so keyboard events always read the latest project/validation state
- **Fixed**: AI-generated content in preview tab now applies `processContent()` (whitespace normalization, merge lines) matching clipboard output
- **Fixed**: `handleCancel` now resets `aiBusy` in `finally` block, preventing stuck busy state on cancel failure
- **Fixed**: Tab close navigation — closing a non-active tab now activates the adjacent tab instead of always switching to "preview"
- **Fixed**: `closeAllAiTabs` preserves debug main tab view when debug tabs remain; falls back to "home" otherwise
- **Fixed**: Settings import now triggers `refreshValidation()`, clears API key scrub flag and reload banner
- **Fixed**: Settings model auto-fetch debounced (150ms) to reduce API calls on rapid typing
- **Fixed**: Sidebar file import now triggers `refreshValidation()` after inserting new reports
- **Fixed**: `processContent` paragraph break handling strips leading/trailing empty lines to avoid orphan `|` separators
- **Fixed**: Settings transfer list — "Remove Chinese" and "Translate Vietnamese" labels now use `t()` translation function
- **Changed**: `handleGenerate` uses silent `persistDraft()` instead of `handleSave()` to avoid unnecessary success toast
- **Changed**: Keyboard shortcut `useEffect` dependency narrowed to only `[language]` (handlers now read from refs)
- **Changed**: `AppSettings.translate_vietnamese` and `AppSettings.remove_chinese` made optional
- **Changed**: Removed `translate_vietnamese` and `remove_chinese` from export settings payload (stored in `ai_config`)
- **Refactored**: Extracted `useExportActions` hook — export logic DRYed across Sidebar and ContentTabs
- **Refactored**: Unified `rewrite_for_target` and `rewrite_all` into `run_rewrite`; removed `rewrite_for_target` public function
- **Refactored**: Inlined `estimate_total_chars()` into `run_rewrite`; `build_chat_request()` now takes `system` string directly
- **Refactored**: SettingsPanel — extracted `saveDraft()` for silent save without toast, reused in `handleGenerate`
- **Refactored**: `AiErrorCode` now derives `PartialEq, Eq`
- **Removed**: ~21 unused translation keys (dead code cleanup)
- **Removed**: Excessive doc comments across Rust and TypeScript modules
- **Removed**: Unused `exportAllMarkdown` import from App.tsx
- **Removed**: Unused `info` toast import from Sidebar
- **Version**: Bumped to 0.7.0.

### v0.6.6 (2026-06-18)
- **Feature**: 4-level prompt system — dropdown to select prompt mode:
  - Level 1: Source-Preserved Summary — keeps reports separate with comparison table
  - Level 2: Unified Final Report — merges into one deduplicated report (default)
  - Level 3: QA Review Handoff — structured handoff document for next reviewer
  - Level 4: Custom Prompt — user writes their own prompt (textarea shown)
- **Changed**: `prompt_level` field added to `AiProviderConfig` (Rust + TypeScript)
- **Changed**: `build_chat_request()` selects prompt based on `prompt_level` instead of always using default
- **Changed**: System prompt textarea only visible when Level 4 (Custom Prompt) is selected
- **Changed**: Renamed "Rewrite prompt" label to "Prompt mode" for clarity
- **Changed**: Removed "Max input characters" from UI — internal hard cap raised to 2M chars (~500K tokens)
- **Changed**: Model and Thinking Mode now share the same row (2-column grid layout)
- **Docs**: Added "Prompt Modes" section in README explaining the 4 prompt levels
- **Version**: Bumped to 0.6.6.

### v0.6.5 (2026-06-18)
- **Fixed**: Debug mode now captures actual request/response from real rewrite — replaced fake "ping" test with real `ChatRequest` serialization and response capture via `capture_request_debug()` and `make_debug_log()`.
- **Fixed**: Loading spinner now shows in ContentTabs (both debug and normal view) when `aiBusy` is true, instead of only in the SettingsPanel button.
- **Fixed**: Debug badge moved to right of "Debug" label text in toolbar.
- **Fixed**: `closeAllAiTabs` now preserves debug tabs (only closes AI tabs).
- **Fixed**: Export buttons in Sidebar now check validation state before exporting.
- **Fixed**: `showAiBadge` now checks for AI-kind tabs specifically (`contentTabs.some(t => t.kind === "ai")`) instead of `contentTabs.length > 1`.
- **Fixed**: `processContent` merge mode — improved fenced code block detection with proper opening/closing fence matching (same char, ≥ length, no info string).
- **Fixed**: Export settings reads `translate_vietnamese`/`remove_chinese` from `ai_config` instead of store state.
- **Fixed**: API key visibility (`showApiKey`) resets when switching projects.
- **Changed**: Renamed "Thinking Effort" to "Thinking Mode" with compatibility warning when enabled.
- **Changed**: Replaced manual timestamp calculation in `slug.rs` with `chrono::Local::now()` for proper local timezone support.
- **Removed**: Dead `ai_rewrite_preview` command (unused since v0.6.3).
- **Removed**: Unused `removeEmptyQa` from store, `translateVietnamese`/`removeChinese` store fields (kept as draft state in SettingsPanel only).
- **Chore**: Added `chrono` 0.4 Rust dependency. Cleaned up excessive doc comments across Rust modules.
- **Version**: Bumped to 0.6.5 (package.json, tauri.conf.json, Cargo.toml).

### v0.6.4 (2026-06-18)
- **Feature**: Remove Chinese characters — `strip_chinese()` removes CJK ideographs and CJK punctuation from AI output (toggle: "Remove Chinese").
- **Feature**: Translate Vietnamese — prepends Vietnamese instruction to system prompt so LLM responds in Vietnamese (toggle: "Translate Vietnamese").
- **Feature**: Import/Export Settings — save and restore all app settings (AI config, UI toggles) as JSON files.
- **Feature**: 2-column checkbox layout — reorganized settings toggles: left column (Cross-review, Compact mode, Normalize whitespace, Export as single line), right column (Enable debug, Remove Chinese, Translate Vietnamese).
- **Feature**: Export/Import settings links in SettingsPanel footer (same line as Reset to default).

### v0.6.3 (2026-06-18)
- **Feature**: Xiaomi MiMo provider — native genai adapter with default endpoint `https://api.xiaomimimo.com/v1/`.
- **Feature**: OpenCode Go provider — 16 models, default endpoint `https://opencode.ai/zen/go/v1`.
- **Feature**: Debug/Log mode — `DebugLog` struct, `ai_test_provider_debug` IPC command, Debug main tab with orange badge, clean debug view (no preview header/stats), scrollable debug logs with detail modal.
- **Feature**: Thinking Effort dropdown — None/Low/Medium/High/Max, passed to genai `ReasoningEffort` (OpenAI, Anthropic, Gemini supported; others silently ignored).
- **Feature**: Export filename timestamps — `review-for-{slug}-{YYYYMMDD-HHmmss}.md` with numeric dedup.
- **Feature**: Auto-fetch models on provider change (replaced Detect Models button).
- **Change**: Removed Groq, Cohere, xAI providers. Updated model lists (OpenAI gpt-5.x, Anthropic claude-sonnet/opus-4.x, Gemini 3.x, DeepSeek v4).
- **Change**: OpenAI Compatible — no fallback models, free text input for model name.
- **Change**: Provider dropdown labels capitalized (OpenAI, Anthropic, Xiaomi MiMo, etc.).
- **Fix**: MiMo 404 error — added trailing slash normalization in `build_client()` for correct URL path joining.
- **Fix**: `base_url` and `model` reset when switching provider kind (prevents stale endpoint).
- **UI**: Export/Import moved to left sidebar footer (2×2 grid with Remove All Sources).
- **UI**: Sticky "Generate Consolidated Report" button, stats grid 4-column single row.
- **UI**: Copy Markdown button full-width matching Generate button size.

### v0.6.2 (2026-06-18)
- **Fix**: `toggleQaActive` — undefined `active` now toggles to `true` (was silently `false`).
- **Fix**: "Close All AI Tabs" button shows with 1+ AI tabs (was 2+).
- **Fix**: `processContent` merge mode — regex now requires space after `#` to strip headings.
- **Fix**: `setProject`/`newProject` — reset `validation`, `previewMarkdown`, `aiBusy` on project switch.
- **Fix**: `handleCancel` — added try/catch to prevent `aiBusy` stuck state.
- **Fix**: `parseInt` — added radix 10 parameter.
- **UX**: ContentTabs export buttons — added validation guard (matches keyboard shortcut).
- **UX**: ContentTabs export — show toast on success/error.
- **UX**: Copy button — added clipboard DOM fallback + visual "Copied!" feedback.
- **Efficiency**: Removed redundant `estimate_total_chars` call in rewrite functions.
- **Efficiency**: Use `AiProviderKind.as_str()` instead of Debug format in commands.
- **Dead code**: Removed unused `aiRewritePreview` from `api.ts`.

### v0.6.1 (2026-06-18)
- **Refactor**: Unified content footer for Preview and AI tabs — Export .md | Export .zip | Copy Markdown | Version.
- **Feature**: Import supports multiple .md and .zip files with auto-detection.
- **Feature**: VI/EN language toggle in toolbar (replaced old export buttons).
- **Feature**: `previewMarkdown` state in store for Preview tab copy support.
- **Change**: Default `max_input_chars` raised from 50,000 to 500,000.
- **Change**: Default system prompt shown as placeholder in Rewrite prompt textarea.
- **UI**: Darker background for Sources/Opening/Closing areas.
- **UI**: Export/Import buttons moved to SettingsPanel sidebar.

### v0.6.0 (2026-06-17)
- **Feature**: AI-Powered Report Consolidation — integrates LLM providers (OpenAI, Anthropic, Gemini, Deepseek, Groq, Cohere, xAI, Ollama, and any OpenAI-compatible endpoint) to automatically rewrite and deduplicate multiple QA reports into a single consolidated report.
- **Feature**: AI provider configuration panel — configure provider kind, base URL, API key, model, max input characters, and custom system prompt per project.
- **Feature**: AI connection testing — test provider connectivity and discover available models before saving.
- **Feature**: AI content tabs — generated reports open in dedicated tabs with HTML/Markdown preview, copy-to-clipboard, and tab management (close, close all).
- **Feature**: AI cancel support — cancel in-flight AI requests from the UI with backend CancellationToken integration.
- **Feature**: Toast notification system — non-blocking success/error/info toasts replace `alert()` for AI operations.
- **Feature**: API key security — keys are scrubbed from localStorage auto-save drafts, redacted in Rust Debug output and error messages, with a reload banner reminding users to re-enter.
- **Fix**: `AiErrorCode` serialization mismatch — custom Serialize/Deserialize impls ensure tag strings match TypeScript's string-union type on the wire.
- **Fix**: `cancel_in_flight()` race condition — token is now taken (not borrowed) from the global slot.
- **Fix**: Settings panel draft state sync — `useEffect` resets draft fields when `project.ai_config` changes.
- **Fix**: `handleGenerate` double-click guard — prevents concurrent AI requests.
- **Fix**: QA target dropdown no longer navigates away from Home tab — uses `selectQaOnly()`.
- **Fix**: `max_input_chars` minimum floor raised from 0 to 1.
- **Fix**: `recordScrubIfNeeded` checks original project's API key, not sanitized draft.
- **Fix**: Content tabs WYSIWYG — display applies `processContent()` to match clipboard output.
- **Fix**: Cancellation tests no longer share global `OnceLock` state.
- **Chore**: Removed dead `clear_cancel()` function and `PreviewPanel.tsx`.
- **Chore**: Fixed `.gitignore` typo (`upstrems` → `upstreams`).
- **Tech**: Added `genai` 0.6.5, `tokio`, `tokio-util` Rust dependencies.

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
