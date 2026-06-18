import { useState } from "react";
import { useProjectStore } from "../state/projectStore";
import { t } from "../lib/i18n";
import { useToast } from "../hooks/useToast";
import { useExportActions } from "../hooks/useExport";
import { PreviewBody } from "./PreviewBody";
import { marked } from "marked";
import DOMPurify from "dompurify";
import pkg from "../../package.json";

export function ContentTabs() {
  const {
    contentTabs, activeContentTabId, setActiveContentTab,
    closeContentTab, closeAllAiTabs, language,
    processContent, previewFormat, project,
    previewMarkdown, validation,
    activeMainTab, aiBusy,
  } = useProjectStore();
  const { success } = useToast();
  const { handleExportMd, handleExportZip } = useExportActions(project, validation, language);
  const [copied, setCopied] = useState(false);

  const activeTab = contentTabs.find((tab) => tab.id === activeContentTabId);

  // Get the content to copy depending on which tab type is active
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
    setTimeout(() => setCopied(false), 2000);
  };

  const debugTabs = contentTabs.filter((tab) => tab.kind === "debug");
  const activeDebugTab = activeTab?.kind === "debug" ? activeTab : debugTabs.length > 0 ? debugTabs[debugTabs.length - 1] : null;
  const isDebugView = activeMainTab === "debug" || activeTab?.kind === "debug";

  // When main tab is debug OR a debug content tab is active → show clean debug view
  if (isDebugView) {
    if (!activeDebugTab) {
      return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 relative">
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 h-[37px]" />
          <div className="flex-1 flex items-center justify-center">
            {aiBusy ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-orange-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-orange-500 font-medium">{language === "vi" ? "Đang gửi yêu cầu AI..." : "Sending AI request..."}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {language === "vi" ? "Bật Debug và chạy Generate để xem log" : "Enable Debug and run Generate to see logs"}
              </p>
            )}
          </div>
        </div>
      );
    }
    const log = activeDebugTab.log;
    return (
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 relative">
        {/* Loading overlay when generating */}
        {aiBusy && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/80">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-orange-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-orange-500 font-medium">{language === "vi" ? "Đang gửi yêu cầu AI..." : "Sending AI request..."}</p>
            </div>
          </div>
        )}
        {/* Tab bar — only show debug tabs */}
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
          {debugTabs.length > 1 && (
            <button onClick={closeAllAiTabs}
              className="ml-2 px-2 py-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors whitespace-nowrap">
              {language === "vi" ? "Đóng tất cả" : "Close all"}
            </button>
          )}
        </div>

        {/* Debug content — clean, no preview header/stats */}
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

        {/* Debug footer */}
        <div className="p-2.5 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-2 flex-shrink-0">
          <div className="flex gap-1.5">
            <button onClick={handleExportMd} className="px-2.5 py-1.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors">
              {t("footer.exportMd", language)}
            </button>
            <button onClick={handleExportZip} className="px-2.5 py-1.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors">
              {t("footer.exportZip", language)}
            </button>
          </div>
          <div className="flex-1 flex justify-center">
            <button onClick={handleCopy} className={`py-2 px-8 text-sm font-bold rounded-lg transition-colors shadow-sm ${copied ? "bg-green-500 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}>
              {copied ? t("toast.copied", language) : (language === "vi" ? "Sao chép debug" : "Copy Debug")}
            </button>
          </div>
          <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 flex-shrink-0">
            v{pkg.version}
          </span>
        </div>
      </div>
    );
  }

  // Normal view (Preview + AI tabs)
  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 relative">
      {/* Loading overlay when generating */}
      {aiBusy && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/80">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-blue-500 font-medium">{language === "vi" ? "Đang tạo báo cáo..." : "Generating report..."}</p>
          </div>
        </div>
      )}
      {/* Tab bar */}
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
        {contentTabs.filter((ct) => ct.kind !== "debug").length > 1 && (
          <button onClick={closeAllAiTabs}
            className="ml-2 px-2 py-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors whitespace-nowrap">
            {t("tab.closeAllAi", language)}
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab?.kind === "preview" ? (
          <PreviewBody />
        ) : activeTab?.kind === "ai" ? (
          <div className="h-full overflow-y-auto p-4">
            {previewFormat === "html" ? (
              <div className="markdown-preview prose dark:prose-invert max-w-none bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(String(marked.parse(processContent(activeTab.markdown), { breaks: true }))) }} />
            ) : (
              <pre className="whitespace-pre-wrap break-words bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-700 dark:text-gray-200 leading-relaxed">
                {processContent(activeTab.markdown)}
              </pre>
            )}
          </div>
        ) : null}
      </div>

      {/* Unified footer — Export, Copy, Version */}
      {activeTab && (
        <div className="p-2.5 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-2 flex-shrink-0">
          <div className="flex gap-1.5">
            <button onClick={handleExportMd} className="px-2.5 py-1.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors">
              {t("footer.exportMd", language)}
            </button>
            <button onClick={handleExportZip} className="px-2.5 py-1.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors">
              {t("footer.exportZip", language)}
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
