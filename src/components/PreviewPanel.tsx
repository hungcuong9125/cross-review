import { useState, useEffect, useCallback } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useProjectStore } from "../state/projectStore";
import { generatePreview, type ExportFile } from "../lib/api";
import { t } from "../lib/i18n";

type ViewMode = "html" | "markdown";

export function PreviewPanel() {
  const {
    project,
    language,
    processContent,
    compactMode,
    removeWhitespace,
    mergeLines,
    toggleCompactMode,
    toggleRemoveWhitespace,
    toggleMergeLines,
    toggleExcludeSelf,
    selectedQaId,
    selectQa,
  } = useProjectStore();
  
  const [preview, setPreview] = useState<ExportFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("html");

  // Set initial selected QA target when active list changes
  useEffect(() => {
    const activeQas = project.qa_reports.filter((q) => q.active !== false);
    if (activeQas.length > 0) {
      if (!selectedQaId || !activeQas.find((q) => q.id === selectedQaId)) {
        selectQa(activeQas[0].id);
      }
    } else {
      if (selectedQaId) {
        selectQa(null);
      }
    }
  }, [project.qa_reports, selectedQaId, selectQa]);

  // Generate preview when target or project changes
  const refreshPreview = useCallback(async () => {
    const activeQas = project.qa_reports.filter((q) => q.active !== false);
    if (!selectedQaId || activeQas.length < 2) {
      setPreview(null);
      return;
    }
    setLoading(true);
    try {
      const result = await generatePreview(project, selectedQaId);
      setPreview(result);
    } catch (err) {
      console.error("Preview error:", err);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [project, selectedQaId]);

  useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

  const handleCopy = async () => {
    if (!preview) return;
    const content = processContent(preview.markdown);
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const activeCount = project.qa_reports.filter((q) => q.active !== false).length;
  const displayContent = preview ? processContent(preview.markdown) : "";
  const displayCharCount = displayContent.length;

  const filename = preview ? preview.filename : "-";
  const inactiveCount = project.qa_reports.filter((q) => q.active === false).length;
  const selfExcluded = project.exclude_self !== false && selectedQaId ? 1 : 0;
  const selectedIsInactive = selectedQaId
    ? project.qa_reports.find((q) => q.id === selectedQaId)?.active === false
    : false;
  const excludedCount = inactiveCount + (selfExcluded && !selectedIsInactive ? 1 : 0);
  const isCleanMode = removeWhitespace && compactMode;
  
  const handleToggleClean = () => {
    toggleRemoveWhitespace();
    toggleCompactMode();
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
            {t("preview.target", language)}
          </label>
          <select
            value={selectedQaId ?? ""}
            onChange={(e) => selectQa(e.target.value)}
            className="flex-1 min-w-0 h-[34px] px-3 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          >
            {project.qa_reports.filter((q) => q.active !== false).map((qa) => (
              <option key={qa.id} value={qa.id}>
                {qa.name || `(${t("sidebar.unnamed", language)})`}
              </option>
            ))}
          </select>
          <button
            onClick={handleCopy}
            disabled={!preview}
            className="h-[34px] px-4 inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium border border-transparent transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {copied ? `✓ ${t("preview.copied", language)}` : t("preview.copy", language)}
          </button>
          <button
            onClick={refreshPreview}
            disabled={loading}
            className="w-[34px] h-[34px] inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm border border-transparent transition-colors disabled:opacity-50 flex-shrink-0"
          >
            ↻
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
              {t("preview.reports", language)}
            </p>
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">
              {activeCount}
            </p>
          </div>
          <div className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
              {t("preview.excludedCount", language)}
            </p>
            <p className="text-sm font-semibold text-red-500 dark:text-red-400">
              {excludedCount}
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
            </p>
          </div>
          <div className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
              {t("preview.file", language)}
            </p>
            <p className="text-xs font-mono font-medium text-gray-700 dark:text-gray-300 truncate">
              {filename}
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedQaId || project.qa_reports.filter((q) => q.active !== false).length < 2 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
              {t("preview.needMore", language)}
            </p>
          </div>
        ) : loading ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {t("preview.loading", language)}
            </p>
          </div>
        ) : preview ? (
          <>
            {/* View mode toggle */}
            <div className="mb-4 flex justify-center gap-2">
              <button
                onClick={() => setViewMode("html")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                  viewMode === "html"
                    ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-semibold"
                    : "bg-gray-50/60 dark:bg-gray-800/30 border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/50"
                }`}
              >
                HTML
              </button>
              <button
                onClick={() => setViewMode("markdown")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                  viewMode === "markdown"
                    ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-semibold"
                    : "bg-gray-50/60 dark:bg-gray-800/30 border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/50"
                }`}
              >
                Markdown
              </button>
            </div>

            {/* Preview content */}
            {viewMode === "html" ? (
              <div
                className="markdown-preview prose dark:prose-invert max-w-none bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(marked(displayContent, { breaks: true }) as string),
                }}
              />
            ) : (
              <pre className="whitespace-pre-wrap break-words bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-700 dark:text-gray-200 leading-relaxed">
                {displayContent}
              </pre>
            )}
          </>
        ) : null}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-start gap-x-5 gap-y-2 flex-wrap flex-shrink-0">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={project.exclude_self !== false}
            onChange={toggleExcludeSelf}
            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold select-none">
            {t("settings.excludeSelf", language)}
          </span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isCleanMode}
            onChange={handleToggleClean}
            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold select-none">
            {t("settings.removeWhitespace", language)}
          </span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={mergeLines}
            onChange={toggleMergeLines}
            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold select-none">
            {t("settings.mergeLines", language)}
          </span>
        </label>
      </div>
    </div>
  );
}
