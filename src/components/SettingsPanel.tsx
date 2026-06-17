import { useState, useEffect } from "react";
import { useProjectStore } from "../state/projectStore";
import { aiTestProvider, aiTestProviderDebug, aiListModels, aiRewriteExport, aiCancelRequest, aiDefaultPrompt, type AiProviderKind, type AiErrorPayload, type DebugLog } from "../lib/api";
import { t } from "../lib/i18n";
import { useToast } from "../hooks/useToast";
import { isApiKeyScrubbed, clearApiKeyScrubbed } from "../lib/sanitize";

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
  } = useProjectStore();

  const { success, error: toastError, info } = useToast();

  // Draft AI config state (separate from saved)
  const [draftKind, setDraftKind] = useState<AiProviderKind>(project.ai_config?.kind ?? "ollama");
  const [draftBaseUrl, setDraftBaseUrl] = useState(project.ai_config?.base_url ?? "");
  const [draftApiKey, setDraftApiKey] = useState(project.ai_config?.api_key ?? "");
  const [draftModel, setDraftModel] = useState(project.ai_config?.model ?? "");
  const [draftMaxChars, setDraftMaxChars] = useState(project.ai_config?.max_input_chars ?? 500000);
  const [draftSystemPrompt, setDraftSystemPrompt] = useState(project.ai_config?.system_prompt ?? "");
  const [draftThinkingEffort, setDraftThinkingEffort] = useState(project.ai_config?.thinking_effort ?? "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [showKeyBanner, setShowKeyBanner] = useState(isApiKeyScrubbed() && !project.ai_config?.api_key && !!project.ai_config);
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<DebugLog | null>(null);

  // Sync draft state when project.ai_config changes (e.g. opening a different project file)
  useEffect(() => {
    setDraftKind(project.ai_config?.kind ?? "ollama");
    setDraftBaseUrl(project.ai_config?.base_url ?? "");
    setDraftApiKey(project.ai_config?.api_key ?? "");
    setDraftModel(project.ai_config?.model ?? "");
    setDraftMaxChars(project.ai_config?.max_input_chars ?? 500000);
    setDraftSystemPrompt(project.ai_config?.system_prompt ?? "");
    setDraftThinkingEffort(project.ai_config?.thinking_effort ?? "");
    setShowKeyBanner(isApiKeyScrubbed() && !project.ai_config?.api_key && !!project.ai_config);
  }, [project.ai_config]);

  // Fetch the default rewrite prompt from backend on mount
  useEffect(() => {
    aiDefaultPrompt().then(setDefaultPrompt).catch(() => { });
  }, []);

  const isDirty = draftKind !== (project.ai_config?.kind ?? "ollama")
    || draftBaseUrl !== (project.ai_config?.base_url ?? "")
    || draftApiKey !== (project.ai_config?.api_key ?? "")
    || draftModel !== (project.ai_config?.model ?? "")
    || draftMaxChars !== (project.ai_config?.max_input_chars ?? 500000)
    || draftSystemPrompt !== (project.ai_config?.system_prompt ?? "")
    || draftThinkingEffort !== (project.ai_config?.thinking_effort ?? "");

  const handleSave = () => {
    const newConfig = {
      kind: draftKind,
      base_url: draftBaseUrl,
      api_key: draftApiKey,
      model: draftModel,
      max_input_chars: draftMaxChars,
      system_prompt: draftSystemPrompt,
      thinking_effort: draftThinkingEffort,
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
    const config = {
      kind: draftKind,
      base_url: draftBaseUrl,
      api_key: draftApiKey,
      model: draftModel,
      max_input_chars: draftMaxChars,
      system_prompt: draftSystemPrompt,
      thinking_effort: draftThinkingEffort,
    };
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
    }
  };

  // Auto-fetch models when provider kind changes
  useEffect(() => {
    if (draftKind === "openaicompatible") {
      setModels([]);
      return;
    }
    let cancelled = false;
    aiListModels({
      kind: draftKind,
      base_url: draftBaseUrl,
      api_key: draftApiKey,
      model: "",
      max_input_chars: draftMaxChars,
      system_prompt: "",
      thinking_effort: "",
    }).then((result) => {
      if (cancelled) return;
      setModels(result);
    }).catch(() => { });
    return () => { cancelled = true; };
  }, [draftKind]);

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
      // Run debug test first if debug is enabled
      if (debugEnabled) {
        try {
          const debugLog = await aiTestProviderDebug(cfg);
          appendDebugTab(debugLog);
          setActiveMainTab("home");
        } catch {
          // Debug test failed, continue with main generate
        }
      }
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
          <label className="flex items-center gap-1.5 mt-4 cursor-pointer">
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
          <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
            <input type="checkbox" checked={debugEnabled} onChange={() => setDebugEnabled(!debugEnabled)} className="w-3 h-3 rounded border-gray-300 text-blue-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">{language === "vi" ? "Bật debug" : "Enable debug"}</span>
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
              <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">{t("settings.aiProvider.name", language)}</label>
              <select value={draftKind} onChange={(e) => {
                const newKind = e.target.value as AiProviderKind;
                setDraftKind(newKind);
                // Clear base_url when switching provider so default endpoint is used
                setDraftBaseUrl("");
                setDraftModel("");
              }}
                className="w-full h-7 text-xs px-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
                {PROVIDER_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
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

            {/* Model */}
            <div>
              <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">{t("settings.aiProvider.model", language)}</label>
              {draftKind === "openaicompatible" ? (
                <input type="text" value={draftModel} onChange={(e) => setDraftModel(e.target.value)}
                  placeholder={language === "vi" ? "Nhập tên model" : "Enter model name"}
                  className="w-full h-7 text-xs px-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent" />
              ) : (
                <select value={draftModel} onChange={(e) => setDraftModel(e.target.value)}
                  className="w-full h-7 text-xs px-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
                  <option value="">{language === "vi" ? "-- Chọn model triển khai --" : "-- Select model --"}</option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
            </div>

            {/* Thinking effort + Max chars — 2 columns */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">
                  {language === "vi" ? "Mức độ suy nghĩ" : "Thinking Effort"}
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
              <div>
                <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">{t("settings.aiProvider.maxChars", language)}</label>
                <input type="number" value={draftMaxChars} onChange={(e) => { const v = parseInt(e.target.value, 10); setDraftMaxChars(Number.isNaN(v) ? 500000 : Math.max(1, v)); }}
                  className="w-full h-7 text-xs px-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent" />
              </div>
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

        {/* Debug logs */}
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

      {/* Debug log detail modal */}
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

      {/* Sticky generate button — always visible */}
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
