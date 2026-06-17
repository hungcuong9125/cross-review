import { useState, useEffect } from "react";
import { useProjectStore } from "../state/projectStore";
import { aiTestProvider, aiListModels, aiRewriteExport, aiCancelRequest, aiDefaultPrompt, exportAllMarkdown, exportAllZip, type AiProviderKind, type AiErrorPayload } from "../lib/api";
import { t } from "../lib/i18n";
import { useToast } from "../hooks/useToast";
import { isApiKeyScrubbed, clearApiKeyScrubbed } from "../lib/sanitize";

const PROVIDER_KINDS: AiProviderKind[] = [
  "ollama", "openai", "anthropic", "gemini", "deepseek", "groq", "cohere", "xai", "openaicompatible",
];

export function SettingsPanel() {
  const {
    project, language,
    previewFormat, setPreviewFormat,
    compactMode, toggleCompactMode,
    removeWhitespace, toggleRemoveWhitespace,
    mergeLines, toggleMergeLines,
    toggleExcludeSelf,
    aiBusy, setAiBusy,
    appendAiTab,
  } = useProjectStore();

  const { success, error: toastError, info } = useToast();

  // Draft AI config state (separate from saved)
  const [draftKind, setDraftKind] = useState<AiProviderKind>(project.ai_config?.kind ?? "ollama");
  const [draftBaseUrl, setDraftBaseUrl] = useState(project.ai_config?.base_url ?? "");
  const [draftApiKey, setDraftApiKey] = useState(project.ai_config?.api_key ?? "");
  const [draftModel, setDraftModel] = useState(project.ai_config?.model ?? "");
  const [draftMaxChars, setDraftMaxChars] = useState(project.ai_config?.max_input_chars ?? 500000);
  const [draftSystemPrompt, setDraftSystemPrompt] = useState(project.ai_config?.system_prompt ?? "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [showKeyBanner, setShowKeyBanner] = useState(isApiKeyScrubbed() && !project.ai_config?.api_key && !!project.ai_config);
  const [defaultPrompt, setDefaultPrompt] = useState("");

  // Sync draft state when project.ai_config changes (e.g. opening a different project file)
  useEffect(() => {
    setDraftKind(project.ai_config?.kind ?? "ollama");
    setDraftBaseUrl(project.ai_config?.base_url ?? "");
    setDraftApiKey(project.ai_config?.api_key ?? "");
    setDraftModel(project.ai_config?.model ?? "");
    setDraftMaxChars(project.ai_config?.max_input_chars ?? 500000);
    setDraftSystemPrompt(project.ai_config?.system_prompt ?? "");
    setShowKeyBanner(isApiKeyScrubbed() && !project.ai_config?.api_key && !!project.ai_config);
  }, [project.ai_config]);

  // Fetch the default rewrite prompt from backend on mount
  useEffect(() => {
    aiDefaultPrompt().then(setDefaultPrompt).catch(() => {});
  }, []);

  const isDirty = draftKind !== (project.ai_config?.kind ?? "ollama")
    || draftBaseUrl !== (project.ai_config?.base_url ?? "")
    || draftApiKey !== (project.ai_config?.api_key ?? "")
    || draftModel !== (project.ai_config?.model ?? "")
    || draftMaxChars !== (project.ai_config?.max_input_chars ?? 500000)
    || draftSystemPrompt !== (project.ai_config?.system_prompt ?? "");

  const handleSave = () => {
    const newConfig = {
      kind: draftKind,
      base_url: draftBaseUrl,
      api_key: draftApiKey,
      model: draftModel,
      max_input_chars: draftMaxChars,
      system_prompt: draftSystemPrompt,
    };
    useProjectStore.setState((state) => ({
      project: { ...state.project, ai_config: newConfig },
    }));
    clearApiKeyScrubbed();
    setShowKeyBanner(false);
    success(t("toast.aiSaved", language));
  };

  const handleTest = async () => {
    setTestResult(null);
    try {
      await aiTestProvider({
        kind: draftKind,
        base_url: draftBaseUrl,
        api_key: draftApiKey,
        model: draftModel,
        max_input_chars: draftMaxChars,
        system_prompt: draftSystemPrompt,
      });
      setTestResult("ok");
      success(t("settings.aiProvider.testOk", language));
    } catch (err) {
      const msg = typeof err === "string" ? err : (err as AiErrorPayload).message ?? String(err);
      setTestResult(msg);
      toastError(msg);
    }
  };

  const handleDetectModels = async () => {
    try {
      const result = await aiListModels({
        kind: draftKind,
        base_url: draftBaseUrl,
        api_key: draftApiKey,
        model: draftModel,
        max_input_chars: draftMaxChars,
        system_prompt: draftSystemPrompt,
      });
      setModels(result);
      if (result.length > 0 && !draftModel) {
        setDraftModel(result[0]);
      }
    } catch (err) {
      const msg = typeof err === "string" ? err : (err as AiErrorPayload).message ?? String(err);
      toastError(msg);
    }
  };

  const handleGenerate = async () => {
    if (aiBusy) return;
    // Auto-save draft config before generating so unsaved changes take effect
    handleSave();
    const cfg = useProjectStore.getState().project.ai_config;
    if (!cfg || !cfg.model) {
      info(t("toast.aiNotConfigured", language));
      return;
    }
    const activeCount = useProjectStore.getState().project.qa_reports.filter(q => q.active !== false).length;
    if (activeCount < 2) {
      info(t("toast.needTwoSources", language));
      return;
    }
    setAiBusy(true);
    try {
      const result = await aiRewriteExport(useProjectStore.getState().project);
      const now = new Date();
      const title = `AI ${now.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })} ${now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
      appendAiTab(result.markdown, title);
    } catch (err) {
      if (typeof err === "string") { toastError(err); return; }
      const e = err as AiErrorPayload;
      switch (e.code) {
        case "input_too_large":
          toastError(e.message);
          break;
        case "timeout":
          toastError(t("toast.aiTimeout", language));
          break;
        case "cancelled":
          // silent
          break;
        case "not_configured":
          info(t("toast.aiNotConfigured", language));
          break;
        case "no_sources":
          info(t("toast.needTwoSources", language));
          break;
        case "empty_response":
          toastError(e.message);
          break;
        case "target_not_found":
          toastError(e.message);
          break;
        case "provider":
          if (/401|403|auth|unauthorized/i.test(e.message)) {
            toastError(t("toast.ai.authError", language));
          } else if (/network|connect|refused|unreachable|timeout|dns|resolve/i.test(e.message)) {
            toastError(t("toast.ai.networkError", language));
          } else {
            toastError(e.message);
          }
          break;
        default:
          toastError(e.message);
      }
    } finally {
      setAiBusy(false);
    }
  };

  const handleCancel = async () => {
    try {
      await aiCancelRequest();
    } catch {
      // If cancel IPC fails, reset busy state so UI isn't stuck
      setAiBusy(false);
    }
  };


  const handleExportMd = async () => {
    if (project.qa_reports.length === 0) { info(t("dialog.noReport", language)); return; }
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const dir = await open({ directory: true, multiple: false });
      if (dir) {
        const paths = await exportAllMarkdown(project, dir as string);
        success(`${t("dialog.exportSuccess", language)}: ${paths.length} files`);
      }
    } catch (err) { toastError(`${t("dialog.exportFail", language)}: ${err}`); }
  };

  const handleExportZip = async () => {
    if (project.qa_reports.length === 0) { info(t("dialog.noReport", language)); return; }
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const defaultName = project.title
        ? `${project.title.toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/-{2,}/g, "-")}-reviews.zip`
        : "review-weaver-export.zip";
      const path = await save({ defaultPath: defaultName, filters: [{ name: "ZIP Archive", extensions: ["zip"] }] });
      if (path) {
        const result = await exportAllZip(project, path);
        success(`${t("dialog.exportSuccess", language)}: ${result}`);
      }
    } catch (err) { toastError(`${t("dialog.exportFail", language)}: ${err}`); }
  };

  const handleImport = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: true,
        filters: [
          { name: "Markdown & ZIP", extensions: ["md", "zip"] },
          { name: "Markdown", extensions: ["md"] },
          { name: "ZIP Archive", extensions: ["zip"] },
        ],
      });
      if (!selected) return;
      const files = Array.isArray(selected) ? selected : [selected];
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const newReports: { id: string; name: string; content: string; active: boolean }[] = [];
      for (const filePath of files) {
        if (filePath.endsWith(".zip")) {
          // For zip: read as binary, extract .md files
          const { readFile } = await import("@tauri-apps/plugin-fs");
          const zipData = await readFile(filePath);
          const { ZipReader, BlobReader, TextWriter } = await import("@zip.js/zip.js");
          const blob = new Blob([zipData]);
          const reader = new ZipReader(new BlobReader(blob));
          const entries = await reader.getEntries();
          for (const entry of entries) {
            if (entry.filename.endsWith(".md") && !entry.directory && entry.getData) {
              const text = await entry.getData(new TextWriter());
              const name = entry.filename.replace(/\.md$/, "").replace(/[_-]/g, " ");
              newReports.push({ id: crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 11), name, content: text, active: true });
            }
          }
          await reader.close();
        } else if (filePath.endsWith(".md")) {
          const text = await readTextFile(filePath);
          const name = filePath.split("/").pop()?.replace(/\.md$/, "").replace(/[_-]/g, " ") ?? "Imported";
          newReports.push({ id: crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 11), name, content: text, active: true });
        }
      }
      if (newReports.length > 0) {
        useProjectStore.setState((state) => ({
          project: { ...state.project, qa_reports: [...state.project.qa_reports, ...newReports] },
        }));
        success(`Imported ${newReports.length} file(s)`);
      }
    } catch (err) { toastError(`Import failed: ${err}`); }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Preview format section */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            {t("settings.previewFormat", language)}
          </h3>
          <div className="flex gap-1">
            <button onClick={() => setPreviewFormat("html")} className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${previewFormat === "html" ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400" : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500"}`}>
              {t("settings.previewFormat.html", language)}
            </button>
            <button onClick={() => setPreviewFormat("markdown")} className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${previewFormat === "markdown" ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400" : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500"}`}>
              {t("settings.previewFormat.markdown", language)}
            </button>
          </div>
          <label className="flex items-center gap-1.5 mt-2 cursor-pointer">
            <input type="checkbox" checked={compactMode} onChange={toggleCompactMode} className="w-3 h-3 rounded border-gray-300 text-blue-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">{t("settings.compactMode", language)}</span>
          </label>
          <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
            <input type="checkbox" checked={project.exclude_self !== false} onChange={toggleExcludeSelf} className="w-3 h-3 rounded border-gray-300 text-blue-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">{t("settings.excludeSelf", language)}</span>
          </label>
          <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
            <input type="checkbox" checked={removeWhitespace} onChange={toggleRemoveWhitespace} className="w-3 h-3 rounded border-gray-300 text-blue-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">{t("settings.removeWhitespace", language)}</span>
          </label>
          <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
            <input type="checkbox" checked={mergeLines} onChange={toggleMergeLines} className="w-3 h-3 rounded border-gray-300 text-blue-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">{t("settings.mergeLines", language)}</span>
          </label>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        {/* AI provider section */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            {t("settings.aiProvider", language)}
          </h3>

          {/* Key scrub banner */}
          {showKeyBanner && (
            <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-300">
              <p className="mb-1">{t("settings.aiProvider.keyMissing", language)}</p>
              <button onClick={() => setShowKeyBanner(false)} className="underline font-medium">
                {t("settings.aiProvider.keyMissingDismiss", language)}
              </button>
            </div>
          )}

          <div className="space-y-2">
            {/* Kind */}
            <div>
              <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">{t("settings.aiProvider.kind", language)}</label>
              <select value={draftKind} onChange={(e) => setDraftKind(e.target.value as AiProviderKind)}
                className="w-full h-7 text-xs px-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
                {PROVIDER_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            {/* Base URL */}
            <div>
              <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">{t("settings.aiProvider.baseUrl", language)}</label>
              <input type="text" value={draftBaseUrl} onChange={(e) => setDraftBaseUrl(e.target.value)}
                placeholder="http://localhost:11434/"
                className="w-full h-7 text-xs px-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent" />
            </div>

            {/* API key */}
            <div>
              <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">{t("settings.aiProvider.apiKey", language)}</label>
              <div className="flex gap-1">
                <input type={showApiKey ? "text" : "password"} value={draftApiKey} onChange={(e) => setDraftApiKey(e.target.value)}
                  className="flex-1 h-7 text-xs px-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent" />
                <button onClick={() => setShowApiKey(!showApiKey)} className="px-2 h-7 text-[10px] bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                  {showApiKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Model + Detect */}
            <div>
              <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">{t("settings.aiProvider.model", language)}</label>
              <div className="flex gap-1">
                <input type="text" value={draftModel} onChange={(e) => setDraftModel(e.target.value)}
                  className="flex-1 h-7 text-xs px-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent" />
                <button onClick={handleDetectModels} className="px-2 h-7 text-[10px] bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 whitespace-nowrap">
                  {t("settings.aiProvider.detectModels", language)}
                </button>
              </div>
              {models.length > 0 && (
                <select className="w-full h-7 mt-1 text-xs px-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded"
                  value={draftModel} onChange={(e) => setDraftModel(e.target.value)}>
                  <option value="">-- select --</option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
            </div>

            {/* Max chars */}
            <div>
              <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">{t("settings.aiProvider.maxChars", language)}</label>
              <input type="number" value={draftMaxChars} onChange={(e) => { const v = parseInt(e.target.value, 10); setDraftMaxChars(Number.isNaN(v) ? 500000 : Math.max(1, v)); }}
                className="w-full h-7 text-xs px-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent" />
            </div>

            {/* System prompt */}
            <div>
              <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">{t("settings.aiPrompt", language)}</label>
              <textarea value={draftSystemPrompt} onChange={(e) => setDraftSystemPrompt(e.target.value)}
                rows={6} placeholder={defaultPrompt || "Custom system prompt..."}
                className="w-full text-xs px-2 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none" />
              <button onClick={() => setDraftSystemPrompt("")} className="text-[10px] text-blue-500 hover:underline mt-0.5">
                {t("settings.aiPrompt.reset", language)}
              </button>
            </div>

            {/* Test + Save buttons */}
            <div className="flex gap-1">
              <button onClick={handleTest} className="flex-1 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors">
                {t("settings.aiProvider.test", language)}
              </button>
              <button onClick={handleSave} className="flex-1 px-3 py-1.5 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors">
                {t("settings.aiProvider.save", language)}
                {isDirty && <span className="ml-1">•</span>}
              </button>
            </div>
            {testResult && (
              <p className={`text-xs ${testResult === "ok" ? "text-green-600" : "text-red-500"}`}>
                {testResult === "ok" ? t("settings.aiProvider.testOk", language) : testResult}
              </p>
            )}
          </div>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={aiBusy || !project.ai_config?.model}
          className="w-full py-2 px-4 text-sm font-bold bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {aiBusy ? t("action.generating", language) : t("action.generateReport", language)}
        </button>

        {/* Cancel button (only when busy) */}
        {aiBusy && (
          <button onClick={handleCancel} className="w-full py-1.5 text-xs font-medium text-red-500 hover:text-red-600 transition-colors">
            {t("action.cancel", language)}
          </button>
        )}
      </div>

      {/* Export / Import footer */}
      <div className="p-2.5 border-t border-gray-200 dark:border-gray-700 flex gap-1.5 flex-shrink-0">
        <button onClick={handleExportMd} className="flex-1 px-2 py-1.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors">
          {t("footer.exportMd", language)}
        </button>
        <button onClick={handleExportZip} className="flex-1 px-2 py-1.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors">
          {t("footer.exportZip", language)}
        </button>
        <button onClick={handleImport} className="flex-1 px-2 py-1.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors">
          {t("footer.import", language)}
        </button>
      </div>
    </div>
  );
}
