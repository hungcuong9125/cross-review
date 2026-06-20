import { useState, useEffect } from "react";
import { useProjectStore } from "../state/projectStore";
import { aiTestProvider, aiTestProviderDebug, aiListModels, aiRewriteExport, aiCancelRequest, exportSettings, importSettings, type AiProviderKind, type AiErrorPayload, type DebugLog, type AppSettings } from "../lib/api";
import { t } from "../lib/i18n";
import { useToast } from "../hooks/useToast";
import { isApiKeyScrubbed, clearApiKeyScrubbed } from "../lib/sanitize";
import { toSlug } from "../lib/slug";

const PROVIDER_KINDS: { value: AiProviderKind; label: string }[] = [
  { value: "ollama", label: "Ollama" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Gemini" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "mimo", label: "Xiaomi MiMo" },
  { value: "opencodego", label: "OpenCode Go" },
  { value: "openaicompatible", label: "OpenAI Compatible" },
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
    appendAiTab, appendDebugTab,
    setActiveMainTab,
    debugEnabled, setDebugEnabled,
  } = useProjectStore();

  const { success, error: toastError, info } = useToast();

  const [draftKind, setDraftKind] = useState<AiProviderKind>(project.ai_config?.kind ?? "ollama");
  const [draftBaseUrl, setDraftBaseUrl] = useState(project.ai_config?.base_url ?? "");
  const [draftApiKey, setDraftApiKey] = useState(project.ai_config?.api_key ?? "");
  const [draftModel, setDraftModel] = useState(project.ai_config?.model ?? "");
  const [draftMaxChars, setDraftMaxChars] = useState(project.ai_config?.max_input_chars ?? 2_000_000);
  const [draftSystemPrompt, setDraftSystemPrompt] = useState(project.ai_config?.system_prompt ?? "");
  const [draftThinkingEffort, setDraftThinkingEffort] = useState(project.ai_config?.thinking_effort ?? "");
  const [draftPromptLevel, setDraftPromptLevel] = useState(project.ai_config?.prompt_level ?? "2");
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [showKeyBanner, setShowKeyBanner] = useState(isApiKeyScrubbed() && !project.ai_config?.api_key && !!project.ai_config);
  const [draftOutputLanguage, setDraftOutputLanguage] = useState(project.ai_config?.output_language ?? "");
  const [draftStripNonPrimary, setDraftStripNonPrimary] = useState(project.ai_config?.strip_non_primary ?? false);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<DebugLog | null>(null);
  useEffect(() => {
    setDraftKind(project.ai_config?.kind ?? "ollama");
    setDraftBaseUrl(project.ai_config?.base_url ?? "");
    setDraftApiKey(project.ai_config?.api_key ?? "");
    setDraftModel(project.ai_config?.model ?? "");
    setDraftSystemPrompt(project.ai_config?.system_prompt ?? "");
    setDraftThinkingEffort(project.ai_config?.thinking_effort ?? "");
    setDraftPromptLevel(project.ai_config?.prompt_level ?? "2");
    setDraftMaxChars(project.ai_config?.max_input_chars ?? 2_000_000);
    setDraftOutputLanguage(project.ai_config?.output_language ?? "");
    setDraftStripNonPrimary(project.ai_config?.strip_non_primary ?? false);
    setShowApiKey(false);
    setShowKeyBanner(isApiKeyScrubbed() && !project.ai_config?.api_key && !!project.ai_config);
  }, [project.ai_config]);

  const isDirty = draftKind !== (project.ai_config?.kind ?? "ollama")
    || draftBaseUrl !== (project.ai_config?.base_url ?? "")
    || draftApiKey !== (project.ai_config?.api_key ?? "")
    || draftModel !== (project.ai_config?.model ?? "")
    || draftMaxChars !== (project.ai_config?.max_input_chars ?? 2_000_000)
    || draftSystemPrompt !== (project.ai_config?.system_prompt ?? "")
    || draftThinkingEffort !== (project.ai_config?.thinking_effort ?? "")
    || draftOutputLanguage !== (project.ai_config?.output_language ?? "")
    || draftStripNonPrimary !== (project.ai_config?.strip_non_primary ?? false)
    || draftPromptLevel !== (project.ai_config?.prompt_level ?? "2");

  const buildDraftConfig = () => ({
    kind: draftKind,
    base_url: draftBaseUrl,
    api_key: draftApiKey,
    model: draftModel,
    max_input_chars: draftMaxChars,
    system_prompt: draftSystemPrompt,
    thinking_effort: draftThinkingEffort,
    output_language: draftOutputLanguage,
    strip_non_primary: draftStripNonPrimary,
    prompt_level: draftPromptLevel,
  });

  const saveDraft = () => {
    const newConfig = buildDraftConfig();
    useProjectStore.setState((state) => ({
      project: { ...state.project, ai_config: newConfig },
    }));
    clearApiKeyScrubbed();
    setShowKeyBanner(false);
  };

  const handleSave = () => {
    saveDraft();
    success(t("toast.aiSaved", language));
  };

  const [testBusy, setTestBusy] = useState(false);

  const handleTest = async () => {
    if (testBusy) return;
    setTestBusy(true);
    setTestResult(null);
    const config = buildDraftConfig();
    try {
      if (debugEnabled) {
        const log = await aiTestProviderDebug(config);
        setDebugLogs((prev) => [log, ...prev]);
        if (log.success) {
          setTestResult("ok");
          success(t("settings.aiProvider.testOk", language));
        } else {
          setTestResult(log.response_text);
          toastError(log.response_text);
        }
      } else {
        await aiTestProvider(config);
        setTestResult("ok");
        success(t("settings.aiProvider.testOk", language));
      }
    } catch (err) {
      const msg = typeof err === "string" ? err : (err as AiErrorPayload).message ?? String(err);
      setTestResult(msg);
      toastError(msg);
    } finally {
      setTestBusy(false);
    }
  };
  useEffect(() => {
    if (draftKind === "openaicompatible") {
      setModels([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      aiListModels({
        kind: draftKind,
        base_url: draftBaseUrl,
        api_key: draftApiKey,
        model: "",
        max_input_chars: draftMaxChars,
        system_prompt: "",
        thinking_effort: "",
        output_language: "",
        strip_non_primary: false,
        prompt_level: "2",
      }).then((result) => {
        if (cancelled) return;
        setModels(result);
      }).catch((e) => { console.error("Failed to fetch models:", e); });
    }, 150);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [draftKind, draftBaseUrl, draftApiKey]);

  const handleGenerate = async () => {
    if (aiBusy) return;
    saveDraft();
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
      if (debugEnabled && result.debug_log) {
        appendDebugTab(result.debug_log);
        setActiveMainTab("debug");
      }
      const now = new Date();
      const title = `AI ${now.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })} ${now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;

      const pad = (n: number) => String(n).padStart(2, "0");
      const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const projectSlug = project.title ? toSlug(project.title) : "";
      const filename = projectSlug ? `ai-report-${projectSlug}-${ts}.md` : `ai-report-${ts}.md`;

      appendAiTab(
        result.markdown,
        title,
        result.markdown.length,
        result.model_used || cfg?.model || "",
        cfg?.prompt_level || "2",
        filename
      );
    } catch (err) {
      if (typeof err === "string") { toastError(err); return; }
      const e = err as AiErrorPayload;
      if (debugEnabled && e.debug_log) {
        appendDebugTab(e.debug_log);
        setActiveMainTab("debug");
      }
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
      // ignore
    } finally {
      setAiBusy(false);
    }
  };

  const handleExportSettings = async () => {
    const state = useProjectStore.getState();
    const settings: AppSettings = {
      document_type: "cross-review-settings",
      ai_config: state.project.ai_config,
      compact_mode: state.compactMode,
      remove_whitespace: state.removeWhitespace,
      merge_lines: state.mergeLines,
      preview_format: state.previewFormat,
      output_language: state.project.ai_config?.output_language ?? "",
      strip_non_primary: state.project.ai_config?.strip_non_primary ?? false,
      debug_enabled: state.debugEnabled,
    };
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const path = await save({
        defaultPath: "cross-review-settings.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (path) {
        await exportSettings(settings, path);
        success(language === "vi" ? "Đã xuất cài đặt" : "Settings exported");
      }
    } catch (err) { toastError(`Export failed: ${err}`); }
  };

  const handleImportSettings = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const path = await open({
        multiple: false,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (path) {
        const settings = await importSettings(path as string);
        useProjectStore.setState((state) => ({
          project: settings.ai_config
            ? { ...state.project, ai_config: settings.ai_config }
            : state.project,
          compactMode: settings.compact_mode,
          removeWhitespace: settings.remove_whitespace,
          mergeLines: settings.merge_lines,
          previewFormat: settings.preview_format as "html" | "markdown",
          debugEnabled: settings.debug_enabled,
        }));
        if (settings.ai_config) {
          setDraftKind(settings.ai_config.kind);
          setDraftBaseUrl(settings.ai_config.base_url);
          setDraftApiKey(settings.ai_config.api_key);
          setDraftModel(settings.ai_config.model);
          setDraftSystemPrompt(settings.ai_config.system_prompt);
          setDraftThinkingEffort(settings.ai_config.thinking_effort);
          setDraftOutputLanguage(settings.ai_config.output_language);
          setDraftStripNonPrimary(settings.ai_config.strip_non_primary);
          setDraftMaxChars(settings.ai_config.max_input_chars);
          setDraftPromptLevel(settings.ai_config.prompt_level);
        }
        useProjectStore.getState().refreshValidation();
        clearApiKeyScrubbed();
        setShowKeyBanner(false);
        success(language === "vi" ? "Đã nhập cài đặt" : "Settings imported");
      }
    } catch (err) { toastError(`Import failed: ${err}`); }
  };

  const importExportButtons = (
    <>
      <button onClick={handleImportSettings} className="text-[10px] text-blue-500 hover:underline">
        {language === "vi" ? "Nhập cài đặt" : "Import settings"}
      </button>
      <button onClick={handleExportSettings} className="text-[10px] text-blue-500 hover:underline">
        {language === "vi" ? "Xuất cài đặt" : "Export settings"}
      </button>
    </>
  );

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
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
          <div className="grid grid-cols-2 gap-x-4 mt-4 mb-2">
            <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
              {language === "vi" ? "THIẾT LẬP HIỂN THỊ" : "DISPLAY SETTINGS"}
            </div>
            <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
              {language === "vi" ? "THIẾT LẬP XỬ LÝ" : "PROCESSING SETTINGS"}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={project.exclude_self !== false} onChange={toggleExcludeSelf} className="w-3 h-3 rounded border-gray-300 text-blue-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">{t("settings.excludeSelf", language)}</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={compactMode} onChange={toggleCompactMode} className="w-3 h-3 rounded border-gray-300 text-blue-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">{t("settings.compactMode", language)}</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={removeWhitespace} onChange={toggleRemoveWhitespace} className="w-3 h-3 rounded border-gray-300 text-blue-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">{t("settings.removeWhitespace", language)}</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={mergeLines} onChange={toggleMergeLines} className="w-3 h-3 rounded border-gray-300 text-blue-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">{t("settings.mergeLines", language)}</span>
              </label>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={debugEnabled} onChange={() => setDebugEnabled(!debugEnabled)} className="w-3 h-3 rounded border-gray-300 text-blue-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">{language === "vi" ? "Bật debug" : "Enable debug"}</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={draftStripNonPrimary} onChange={() => setDraftStripNonPrimary(!draftStripNonPrimary)} className="w-3 h-3 rounded border-gray-300 text-blue-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">{t("settings.stripNonPrimary", language)}</span>
              </label>
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-2">{t("settings.outputLanguage", language)}</span>
                <select value={draftOutputLanguage} onChange={(e) => setDraftOutputLanguage(e.target.value)}
                  className="w-full h-6 text-xs px-2 bg-gray-100 dark:bg-gray-600">
                  <option value="">{t("settings.outputLanguage.chooseLanguage", language)}</option>
                  <option value="vi">{language === "vi" ? "Tiếng Việt" : "Vietnamese"}</option>
                  <option value="en">English</option>
                  <option value="zh">{language === "vi" ? "中文 (Trung Quốc)" : "中文 (Chinese)"}</option>
                  <option value="ja">{language === "vi" ? "日本語 (Nhật)" : "日本語 (Japanese)"}</option>
                  <option value="ko">{language === "vi" ? "한국어 (Hàn)" : "한국어 (Korean)"}</option>
                  <option value="ru">{language === "vi" ? "Русский (Nga)" : "Русский (Russian)"}</option>
                  <option value="fr">{language === "vi" ? "Français (Pháp)" : "Français (French)"}</option>
                  <option value="de">{language === "vi" ? "Deutsch (Đức)" : "Deutsch (German)"}</option>
                  <option value="es">{language === "vi" ? "Español (TBN)" : "Español (Spanish)"}</option>
                  <option value="pt">{language === "vi" ? "Português (BĐN)" : "Português (Portuguese)"}</option>
                  <option value="it">{language === "vi" ? "Italiano (Ý)" : "Italiano (Italian)"}</option>
                  <option value="th">{language === "vi" ? "ไทย (Thái)" : "ไทย (Thai)"}</option>
                  <option value="ar">{language === "vi" ? "العربية (Ả Rập)" : "العربية (Arabic)"}</option>
                  <option value="hi">{language === "vi" ? "हिन्दी (Hindi)" : "हिन्दी (Hindi)"}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            {t("settings.aiProvider", language)}
          </h3>
          {showKeyBanner && (
            <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-300">
              <p className="mb-1">{t("settings.aiProvider.keyMissing", language)}</p>
              <button onClick={() => setShowKeyBanner(false)} className="underline font-medium">
                {t("settings.aiProvider.keyMissingDismiss", language)}
              </button>
            </div>
          )}

          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">{t("settings.aiProvider.name", language)}</label>
              <select value={draftKind} onChange={(e) => {
                const newKind = e.target.value as AiProviderKind;
                setDraftKind(newKind);
                setDraftBaseUrl("");
                setDraftModel("");
              }}
                className="w-full h-7 text-xs px-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
                {PROVIDER_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">{t("settings.aiProvider.baseUrl", language)}</label>
              <input type="text" value={draftBaseUrl} onChange={(e) => setDraftBaseUrl(e.target.value)}
                placeholder="http://localhost:11434/"
                className="w-full h-7 text-xs px-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent" />
            </div>
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">{t("settings.aiProvider.model", language)}</label>
                {draftKind === "openaicompatible" ? (
                  <input type="text" value={draftModel} onChange={(e) => setDraftModel(e.target.value)}
                    placeholder={language === "vi" ? "Nhập tên model" : "Enter model name"}
                    className="w-full h-7 text-xs px-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent" />
                ) : (
                  <select value={draftModel} onChange={(e) => setDraftModel(e.target.value)}
                    className="w-full h-7 text-xs px-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
                    <option value="">{language === "vi" ? "-- Chọn model --" : "-- Select model --"}</option>
                    {models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">
                  {language === "vi" ? "Chế độ suy nghĩ" : "Thinking Mode"}
                </label>
                <select value={draftThinkingEffort} onChange={(e) => setDraftThinkingEffort(e.target.value)}
                  className="w-full h-7 text-xs px-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
                  <option value="">{language === "vi" ? "Không" : "None"}</option>
                  <option value="low">{language === "vi" ? "Thấp" : "Low"}</option>
                  <option value="medium">{language === "vi" ? "Trung bình" : "Medium"}</option>
                  <option value="high">{language === "vi" ? "Cao" : "High"}</option>
                  <option value="max">{language === "vi" ? "Tối đa" : "Max"}</option>
                </select>
              </div>
            </div>
            {draftThinkingEffort && (
              <p className="text-[10px] text-red-500 dark:text-red-400 -mt-1">
                {language === "vi"
                  ? "⚠ Không phải model nào cũng hỗ trợ Thinking Mode, nếu chọn sai sẽ bị bỏ qua"
                  : "⚠ Some models lack Thinking Mode, invalid settings will be ignored silently"}
              </p>
            )}
            <div>
              <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">{t("settings.aiPrompt", language)}</label>
              <select value={draftPromptLevel} onChange={(e) => setDraftPromptLevel(e.target.value)}
                className="w-full h-7 text-xs px-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
                <option value="1">{language === "vi" ? "Mức 1: Giữ nguyên nguồn" : "Level 1: Source-Preserved Summary"}</option>
                <option value="2">{language === "vi" ? "Mức 2: Báo cáo thống nhất" : "Level 2: Unified Final Report"}</option>
                <option value="3">{language === "vi" ? "Mức 3: Bàn giao QA" : "Level 3: QA Review Handoff"}</option>
                <option value="4">{language === "vi" ? "Mức 4: Prompt tuỳ chỉnh" : "Level 4: Custom Prompt"}</option>
              </select>
            </div>
            {draftPromptLevel === "4" && (
              <div>
                <textarea value={draftSystemPrompt} onChange={(e) => setDraftSystemPrompt(e.target.value)}
                  rows={6} placeholder={language === "vi" ? "Nhập prompt tuỳ chỉnh tại đây..." : "Enter your custom prompt here..."}
                  className="w-full text-xs px-2 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none" />
                <div className="flex items-center justify-between mt-0.5">
                  <button onClick={() => setDraftSystemPrompt("")} className="text-[10px] text-blue-500 hover:underline">
                    {t("settings.aiPrompt.reset", language)}
                  </button>
                  {importExportButtons}
                </div>
              </div>
            )}
            {draftPromptLevel !== "4" && (
              <div className="flex items-center justify-end gap-4 mt-0.5">
                {importExportButtons}
              </div>
            )}
            <div className="flex gap-1">
              <button onClick={handleTest} disabled={testBusy} className="flex-1 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
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
        {debugEnabled && debugLogs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {language === "vi" ? "Nhật ký debug" : "Debug Logs"}
              </h3>
              <button onClick={() => setDebugLogs([])} className="text-[10px] text-red-400 hover:text-red-600 transition-colors">
                {language === "vi" ? "Xoá" : "Clear"}
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-200 dark:border-gray-700 rounded p-1.5">
              {debugLogs.map((log, i) => (
                <button key={i} onClick={() => setSelectedLog(log)}
                  className="w-full text-left px-2 py-1.5 text-[10px] rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.success ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-gray-500 dark:text-gray-400 font-mono">{log.provider}</span>
                  <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{log.model}</span>
                  <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">{log.duration_ms}ms</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedLog(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[90vw] max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                {language === "vi" ? "Chi tiết debug" : "Debug Detail"}
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-gray-500">Provider:</span> <span className="font-mono">{selectedLog.provider}</span></div>
                <div><span className="text-gray-500">Model:</span> <span className="font-mono">{selectedLog.model}</span></div>
                <div><span className="text-gray-500">Thinking:</span> <span className="font-mono">{selectedLog.thinking_effort || "none"}</span></div>
                <div><span className="text-gray-500">Duration:</span> <span className="font-mono">{selectedLog.duration_ms}ms</span></div>
                <div className="col-span-2">
                  <span className="text-gray-500">Status:</span>{" "}
                  <span className={selectedLog.success ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                    {selectedLog.success ? "OK" : "FAILED"}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-gray-500 font-semibold mb-1">Request:</p>
                <pre className="bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto whitespace-pre-wrap break-words">
                  {selectedLog.request_messages}
                </pre>
              </div>
              <div>
                <p className="text-gray-500 font-semibold mb-1">{selectedLog.success ? "Response:" : "Error:"}</p>
                <pre className="bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto whitespace-pre-wrap break-words">
                  {selectedLog.response_text}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="p-2.5 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 space-y-1">
        <button
          onClick={handleGenerate}
          disabled={aiBusy || !project.ai_config?.model}
          className="w-full py-2 px-4 text-sm font-bold bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {aiBusy ? t("action.generating", language) : t("action.generateReport", language)}
        </button>
        {aiBusy && (
          <button onClick={handleCancel} className="w-full py-1.5 text-xs font-medium text-red-500 hover:text-red-600 transition-colors">
            {t("action.cancel", language)}
          </button>
        )}
      </div>
    </div>
  );
}
