import { useState, useEffect, useRef, useMemo } from "react";
import { useProjectStore } from "../state/projectStore";
import { t } from "../lib/i18n";
import { useToast } from "../hooks/useToast";
import { useExportActions } from "../hooks/useExport";
import { PreviewBody } from "./PreviewBody";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { percentChange } from "../lib/utils";
import { isValidMarkdownReport } from "../lib/sanitize";
import pkg from "../../package.json";

function LoadingSpinner({ color = "orange" }: { color?: "orange" | "blue" }) {
  const colorClass = color === "orange" ? "border-orange-400" : "border-blue-400";
  return <div className={`w-8 h-8 border-3 ${colorClass} border-t-transparent rounded-full animate-spin`} />;
}

function LoadingOverlay({ color, language }: { color: "orange" | "blue"; language: "vi" | "en" }) {
  const text = t(color === "orange" ? "loading.aiRequest" : "loading.generatingReport", language);
  const textColor = color === "orange" ? "text-orange-500" : "text-blue-500";
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/80">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner color={color} />
        <p className={`text-sm ${textColor} font-medium`}>{text}</p>
      </div>
    </div>
  );
}

function AiTabContent({ tab }: {
  tab: {
    id: string;
    kind: "ai";
    title: string;
    markdown: string;
    initialCharCount: number;
    modelUsed: string;
    promptLevel: string;
    filename: string;
  };
}) {
  const {
    language,
    previewFormat,
    processContent,
    compactMode,
    removeWhitespace,
    mergeLines,
  } = useProjectStore();

  const processedContent = useMemo(
    () => processContent(tab.markdown),
    [tab.markdown, processContent, compactMode, removeWhitespace, mergeLines]
  );
  const displayCharCount = processedContent.length;
  const initialCharCount = tab.initialCharCount;
  const pct = percentChange(initialCharCount, displayCharCount);

  const getPromptLevelLabel = (level: string, lang: string) => {
    switch (level) {
      case "1": return lang === "vi" ? "Mức 1" : "Level 1";
      case "2": return lang === "vi" ? "Mức 2" : "Level 2";
      case "3": return lang === "vi" ? "Mức 3" : "Level 3";
      case "4": return lang === "vi" ? "Mức 4" : "Level 4";
      default: return `Level ${level}`;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        <div className="grid grid-cols-5 gap-2">
          <div className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
              {t("preview.modelUsed", language)}
            </p>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 truncate" title={tab.modelUsed}>
              {tab.modelUsed}
            </p>
          </div>
          <div className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
              {t("preview.promptLevel", language)}
            </p>
            <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 truncate">
              {getPromptLevelLabel(tab.promptLevel, language)}
            </p>
          </div>
          <div className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
              {t("preview.initialCharacters", language)}
            </p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 font-mono">
              {initialCharCount > 0 ? initialCharCount.toLocaleString() : "—"}
            </p>
          </div>
          <div className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
              {t("preview.characters", language)}
              {(compactMode || removeWhitespace || mergeLines) && (
                <span className="ml-1 text-[8px] text-blue-500">(proc)</span>
              )}
            </p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {displayCharCount.toLocaleString()}
              {initialCharCount > 0 && (
                <span className={`ml-1 text-xs font-normal ${pct < 0 ? "text-green-600 dark:text-green-400" : pct > 0 ? "text-red-500" : "text-gray-500"}`}>
                  ({pct >= 0 ? "+" : ""}{pct}%)
                </span>
              )}
            </p>
          </div>
          <div className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
              {t("preview.file", language)}
            </p>
            <p className="text-xs font-mono font-medium text-gray-700 dark:text-gray-300 truncate" title={tab.filename}>
              {tab.filename}
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {previewFormat === "html" ? (
          <div className="markdown-preview prose dark:prose-invert max-w-none bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(String(marked.parse(processedContent, { breaks: true }))) }} />
        ) : (
          <pre className="whitespace-pre-wrap break-words bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-700 dark:text-gray-200 leading-relaxed">
            {processedContent}
          </pre>
        )}
      </div>
    </div>
  );
}

export function ContentTabs() {
  const {
    contentTabs, activeContentTabId, setActiveContentTab,
    closeContentTab, closeAllAiTabs, closeAllDebugTabs, language,
    processContent,
    previewMarkdown,
    activeMainTab, aiBusy,
    appendAiTab,
  } = useProjectStore();
  const { success } = useToast();
  const { handleExportTabMd, handleExportAllTabsZip, handleExportDebugLog } = useExportActions();
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const handleImportReport = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const selected = await open({
        multiple: true,
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
      if (!selected) return;
      const filePaths = Array.isArray(selected) ? selected : [selected];
      let imported = 0;
      for (const filePath of filePaths) {
        const content = await readTextFile(filePath);
        const baseName = filePath.split(/[/\\]/).pop() || "Imported Report";
        if (!isValidMarkdownReport(baseName, content)) {
          alert(t("tab.importFileInvalid", language).replace("{baseName}", () => baseName));
          continue;
        }
        const title = baseName.endsWith(".md") ? baseName.slice(0, -3) : baseName;
        appendAiTab(content, title, content.length, "Imported", "N/A", baseName);
        imported++;
      }
      if (imported > 0) {
        success(t("tab.importSuccess", language));
      }
    } catch (err) {
      console.error("Import error:", err);
      alert(`${t("tab.importFail", language)}: ${err}`);
    }
  };

  const activeTab = contentTabs.find((tab) => tab.id === activeContentTabId);
  const getCopyContent = () => {
    if (activeTab?.kind === "debug") {
      const log = activeTab.log;
      return [
        `Provider: ${log.provider}`,
        `Model: ${log.model}`,
        `Thinking: ${log.thinking_effort || "none"}`,
        `Duration: ${log.duration_ms}ms`,
        `Status: ${log.success ? "OK" : "FAILED"}`,
        "",
        "--- Request ---",
        log.request_messages,
        "",
        `--- ${log.success ? "Response" : "Error"} ---`,
        log.response_text,
      ].join("\n");
    }
    if (!activeTab) return "";
    if (activeTab.kind === "ai") return processContent(activeTab.markdown);
    return previewMarkdown;
  };

  const handleCopy = async () => {
    const content = getCopyContent();
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = content;
      textarea.style.cssText = "position:fixed;left:-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch {
        // ignore copy failures
      }
      document.body.removeChild(textarea);
    }
    setCopied(true);
    success(t("toast.copied", language));
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const debugTabs = contentTabs.filter((tab) => tab.kind === "debug");
  const activeDebugTab = activeTab?.kind === "debug" ? activeTab : debugTabs.length > 0 ? debugTabs[debugTabs.length - 1] : null;
  const isDebugView = activeMainTab === "debug" || activeTab?.kind === "debug";
  if (isDebugView) {
    if (!activeDebugTab) {
      return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 relative">
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 h-[37px]" />
          <div className="flex-1 flex items-center justify-center">
            {aiBusy ? (
              <div className="flex flex-col items-center gap-3">
                <LoadingSpinner color="orange" />
                <p className="text-sm text-orange-500 font-medium">{t("loading.aiRequest", language)}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {t("tab.debugEmpty", language)}
              </p>
            )}
          </div>
        </div>
      );
    }
    const log = activeDebugTab.log;
    return (
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 relative">
        {aiBusy && <LoadingOverlay color="orange" language={language} />}
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 overflow-x-auto">
          {debugTabs.map((tab) => {
            const isActive = tab.id === activeContentTabId;
            return (
              <div key={tab.id} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${isActive ? "border-orange-500 text-orange-600 dark:text-orange-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
                onClick={() => setActiveContentTab(tab.id)}>
                <span>{tab.title}</span>
                <button onClick={(e) => { e.stopPropagation(); closeContentTab(tab.id); }}
                  className="ml-1 w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600"
                  title={t("tab.closeAi", language)}>×</button>
              </div>
            );
          })}
          {debugTabs.length > 0 && (
            <>
              <span className="text-gray-300 dark:text-gray-600 text-xs mx-1">|</span>
              <button onClick={closeAllDebugTabs}
                className="px-2 py-1 text-[10px] text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors whitespace-nowrap"
                title={t("tab.closeAllAi", language)}>
                {t("tab.closeAllAi", language)}
              </button>
            </>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-500">Provider:</span> <span className="font-mono font-semibold">{log.provider}</span></div>
              <div><span className="text-gray-500">Model:</span> <span className="font-mono font-semibold">{log.model}</span></div>
              <div><span className="text-gray-500">Thinking:</span> <span className="font-mono">{log.thinking_effort || "none"}</span></div>
              <div><span className="text-gray-500">Duration:</span> <span className="font-mono">{log.duration_ms}ms</span></div>
              <div className="col-span-2">
                <span className="text-gray-500">Status:</span>{" "}
                <span className={log.success ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                  {log.success ? "✓ OK" : "✗ FAILED"}
                </span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Request</p>
            <pre className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words overflow-x-auto">
              {log.request_messages}
            </pre>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              {log.success ? "Response" : "Error"}
            </p>
            <pre className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words overflow-x-auto">
              {log.response_text}
            </pre>
          </div>
        </div>
        <div className="p-2.5 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-2 flex-shrink-0">
          <div className="flex gap-1.5">
            <button onClick={handleExportDebugLog} className="px-2.5 py-1.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors">
              {t("footer.exportMd", language)}
            </button>
          </div>
          <div className="flex-1 flex justify-center">
            <button onClick={handleCopy} className={`py-2 px-8 text-sm font-bold rounded-lg transition-colors shadow-sm ${copied ? "bg-green-500 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}>
              {copied ? t("toast.copied", language) : t("tab.copyDebug", language)}
            </button>
          </div>
          <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 flex-shrink-0">
            v{pkg.version}
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 relative">
      {aiBusy && <LoadingOverlay color="blue" language={language} />}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 overflow-x-auto">
        {contentTabs.filter((ct) => ct.kind !== "debug").map((tab) => {
          const isActive = tab.id === activeContentTabId;
          return (
            <div key={tab.id} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${isActive ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
              onClick={() => setActiveContentTab(tab.id)}>
              <span>{tab.title}</span>
              {tab.id !== "preview" && (
                <button onClick={(e) => { e.stopPropagation(); closeContentTab(tab.id); }}
                  className="ml-1 w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600"
                  title={t("tab.closeAi", language)}>×</button>
              )}
            </div>
          );
        })}
        <span className="text-gray-300 dark:text-gray-600 text-xs mx-1">|</span>
        <button onClick={handleImportReport}
          className="px-2 py-1 text-[10px] text-gray-400 dark:text-gray-500 hover:text-blue-500 transition-colors whitespace-nowrap">
          {t("tab.importReport", language)}
        </button>

        {contentTabs.filter((ct) => ct.kind !== "debug").length > 1 && (
          <>
            <span className="text-gray-300 dark:text-gray-600 text-xs mx-1">|</span>
            <button onClick={closeAllAiTabs}
              className="px-2 py-1 text-[10px] text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors whitespace-nowrap">
              {t("tab.closeAllAi", language)}
            </button>
          </>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab?.kind === "preview" ? (
          <PreviewBody />
        ) : activeTab?.kind === "ai" ? (
          <AiTabContent tab={activeTab} />
        ) : null}
      </div>
      {activeTab && (
        <div className="p-2.5 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-2 flex-shrink-0">
          <div className="flex gap-1.5">
            <button onClick={handleExportAllTabsZip} className="px-2.5 py-1.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors">
              {t("footer.exportAllZip", language)}
            </button>
            <button onClick={handleExportTabMd} className="px-2.5 py-1.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors">
              {t("footer.exportMd", language)}
            </button>
          </div>
          <div className="flex-1 flex justify-center">
            <button onClick={handleCopy} className={`py-2 px-8 text-sm font-bold rounded-lg transition-colors shadow-sm ${copied ? "bg-green-500 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}>
              {copied ? t("toast.copied", language) : t("preview.copy", language)}
            </button>
          </div>
          <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 flex-shrink-0">
            v{pkg.version}
          </span>
        </div>
      )}
    </div>
  );
}
