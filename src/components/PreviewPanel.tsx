import { useState, useEffect, useCallback } from "react";
import { marked } from "marked";
import { useProjectStore } from "../state/projectStore";
import { generatePreview, type ExportFile } from "../lib/api";

export function PreviewPanel() {
  const { project } = useProjectStore();
  const [previewTargetId, setPreviewTargetId] = useState<string | null>(null);
  const [preview, setPreview] = useState<ExportFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Set initial preview target when QA list changes
  useEffect(() => {
    if (project.qa_reports.length > 0 && !previewTargetId) {
      setPreviewTargetId(project.qa_reports[0].id);
    }
    if (
      previewTargetId &&
      !project.qa_reports.find((q) => q.id === previewTargetId)
    ) {
      setPreviewTargetId(project.qa_reports[0]?.id ?? null);
    }
  }, [project.qa_reports, previewTargetId]);

  // Generate preview when target changes
  const refreshPreview = useCallback(async () => {
    if (!previewTargetId || project.qa_reports.length < 2) {
      setPreview(null);
      return;
    }
    setLoading(true);
    try {
      const result = await generatePreview(project, previewTargetId);
      setPreview(result);
    } catch (err) {
      console.error("Preview error:", err);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [project, previewTargetId]);

  useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

  const handleCopy = async () => {
    if (!preview) return;
    try {
      await navigator.clipboard.writeText(preview.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = preview.markdown;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const targetQa = project.qa_reports.find((q) => q.id === previewTargetId);
  const otherCount = project.qa_reports.length - 1;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header with selector */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Preview cho:
          </label>
          <select
            value={previewTargetId ?? ""}
            onChange={(e) => setPreviewTargetId(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {project.qa_reports.map((qa) => (
              <option key={qa.id} value={qa.id}>
                {qa.name || "(chưa đặt tên)"}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleCopy}
            disabled={!preview}
            className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs font-medium transition-colors disabled:opacity-50"
          >
            {copied ? "✓ Đã copy!" : "Copy markdown"}
          </button>
          <button
            onClick={refreshPreview}
            disabled={loading}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs font-medium transition-colors disabled:opacity-50"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!previewTargetId || project.qa_reports.length < 2 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
              Cần ít nhất 2 QA để xem preview
            </p>
          </div>
        ) : loading ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Đang tạo preview...
            </p>
          </div>
        ) : preview ? (
          <>
            {/* Info banner */}
            <div className="mb-4 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Preview này dành cho{" "}
                <strong>{targetQa?.name || "(chưa đặt tên)"}</strong>. Nội dung
                của {targetQa?.name || "QA này"} đã được loại khỏi file.
              </p>
            </div>

            {/* Stats */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Báo cáo đưa vào
                </p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {otherCount}
                </p>
              </div>
              <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Báo cáo bị loại
                </p>
                <p className="text-lg font-semibold text-red-500 dark:text-red-400">
                  1
                </p>
              </div>
              <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tổng ký tự
                </p>
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {preview.markdown.length.toLocaleString()}
                </p>
              </div>
              <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tên file
                </p>
                <p className="text-sm font-mono font-medium text-gray-700 dark:text-gray-300 truncate">
                  {preview.filename}
                </p>
              </div>
            </div>

            {/* Markdown preview */}
            <div
              className="markdown-preview prose dark:prose-invert max-w-none bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
              dangerouslySetInnerHTML={{
                __html: marked(preview.markdown, { breaks: true }) as string,
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
