import { useState, useEffect, useCallback } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useProjectStore } from "../state/projectStore";
import { generatePreview, type ExportFile } from "../lib/api";
import { t } from "../lib/i18n";

export function PreviewBody() {
  const {
    project,
    language,
    processContent,
    compactMode,
    removeWhitespace,
    mergeLines,
    selectedQaId,
    selectQaOnly,
    previewFormat,
    setPreviewMarkdown,
  } = useProjectStore();

  const [preview, setPreview] = useState<ExportFile | null>(null);
  const [loading, setLoading] = useState(false);

  // Set initial selected QA target when active list changes
  useEffect(() => {
    const activeQas = project.qa_reports.filter((q) => q.active !== false);
    if (activeQas.length > 0) {
      if (!selectedQaId || !activeQas.find((q) => q.id === selectedQaId)) {
        selectQaOnly(activeQas[0].id);
      }
    } else {
      if (selectedQaId) {
        selectQaOnly(null);
      }
    }
  }, [project.qa_reports, selectedQaId, selectQaOnly]);

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

  const activeCount = project.qa_reports.filter((q) => q.active !== false).length;
  const displayContent = preview ? processContent(preview.markdown) : "";

  // Sync preview content to store for footer copy
  useEffect(() => {
    setPreviewMarkdown(displayContent);
  }, [displayContent, setPreviewMarkdown]);
  const displayCharCount = displayContent.length;

  const filename = preview ? preview.filename : "-";
  const inactiveCount = project.qa_reports.filter((q) => q.active === false).length;
  const selfExcluded = project.exclude_self !== false && selectedQaId ? 1 : 0;
  const selectedIsInactive = selectedQaId
    ? project.qa_reports.find((q) => q.id === selectedQaId)?.active === false
    : false;
  const excludedCount = inactiveCount + (selfExcluded && !selectedIsInactive ? 1 : 0);

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
            onChange={(e) => selectQaOnly(e.target.value)}
            className="flex-1 min-w-0 h-[34px] px-3 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          >
            {project.qa_reports.filter((q) => q.active !== false).map((qa) => (
              <option key={qa.id} value={qa.id}>
                {qa.name || `(${t("sidebar.unnamed", language)})`}
              </option>
            ))}
          </select>
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
            {/* Preview content */}
            {previewFormat === "html" ? (
              <div
                className="markdown-preview prose dark:prose-invert max-w-none bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(String(marked.parse(displayContent, { breaks: true }))),
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
    </div>
  );
}
