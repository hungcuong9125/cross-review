import { useProjectStore } from "../state/projectStore";
import { t } from "../lib/i18n";
import { PreviewBody } from "./PreviewBody";
import { marked } from "marked";
import DOMPurify from "dompurify";

export function ContentTabs() {
  const {
    contentTabs, activeContentTabId, setActiveContentTab,
    closeContentTab, closeAllAiTabs, language,
    processContent, previewFormat,
  } = useProjectStore();

  const activeTab = contentTabs.find((t) => t.id === activeContentTabId);

  const handleCopy = async () => {
    if (!activeTab) return;
    const content = activeTab.kind === "ai" ? activeTab.markdown : "";
    try {
      await navigator.clipboard.writeText(processContent(content));
    } catch {
      // fallback
    }
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
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(activeTab.markdown, { breaks: true }) as string) }} />
            ) : (
              <pre className="whitespace-pre-wrap break-words bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-700 dark:text-gray-200 leading-relaxed">
                {activeTab.markdown}
              </pre>
            )}
          </div>
        ) : null}
      </div>

      {/* Action bar footer */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-3 flex-shrink-0">
        <button onClick={handleCopy} className="px-2.5 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors">
          {t("preview.copy", language)}
        </button>
      </div>
    </div>
  );
}
