import { useProjectStore } from "../state/projectStore";
import { t } from "../lib/i18n";
import { PreviewBody } from "./PreviewBody";
import { exportAllMarkdown, exportAllZip } from "../lib/api";
import { marked } from "marked";
import DOMPurify from "dompurify";
import pkg from "../../package.json";

export function ContentTabs() {
  const {
    contentTabs, activeContentTabId, setActiveContentTab,
    closeContentTab, closeAllAiTabs, language,
    processContent, previewFormat, project,
    previewMarkdown,
  } = useProjectStore();

  const activeTab = contentTabs.find((tab) => tab.id === activeContentTabId);

  // Get the markdown to copy: for AI tabs use the tab's markdown, for preview use the preview content
  const getCopyContent = () => {
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
      // clipboard API may be unavailable in non-HTTPS contexts
    }
  };

  const handleExportMd = async () => {
    if (project.qa_reports.length === 0) return;
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const dir = await open({ directory: true, multiple: false });
      if (dir) {
        await exportAllMarkdown(project, dir as string);
      }
    } catch (err) { console.error("Export error:", err); }
  };

  const handleExportZip = async () => {
    if (project.qa_reports.length === 0) return;
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const defaultName = project.title
        ? `${project.title.toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/-{2,}/g, "-")}-reviews.zip`
        : "review-weaver-export.zip";
      const path = await save({ defaultPath: defaultName, filters: [{ name: "ZIP Archive", extensions: ["zip"] }] });
      if (path) await exportAllZip(project, path);
    } catch (err) { console.error("Zip export error:", err); }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 overflow-x-auto">
        {contentTabs.map((tab) => {
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
        {contentTabs.length > 2 && (
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
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(String(marked.parse(activeTab.markdown, { breaks: true }))) }} />
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
        <div className="p-2.5 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center flex-shrink-0">
          {/* Left: Export buttons */}
          <div className="flex gap-1.5">
            <button onClick={handleExportMd} className="px-2.5 py-1.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors">
              {t("footer.exportMd", language)}
            </button>
            <button onClick={handleExportZip} className="px-2.5 py-1.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors">
              {t("footer.exportZip", language)}
            </button>
          </div>

          {/* Center: Copy Markdown */}
          <div className="flex-1 flex justify-center">
            <button onClick={handleCopy} className="px-6 py-1.5 text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-sm">
              {t("preview.copy", language)}
            </button>
          </div>

          {/* Right: Version */}
          <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
            v{pkg.version}
          </span>
        </div>
      )}
    </div>
  );
}
