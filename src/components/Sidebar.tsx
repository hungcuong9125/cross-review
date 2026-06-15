import { useProjectStore } from "../state/projectStore";
import { t } from "../lib/i18n";

export function Sidebar() {
  const {
    project,
    activeTab,
    selectQa,
    selectComponent,
    addQa,
    removeQa,
    duplicateQa,
    removeEmptyQa,
    removeAllQa,
    addComponent,
    language,
  } = useProjectStore();

  const qaReports = project.qa_reports;
  const openingComponents = project.components
    .filter((c) => c.position === "opening")
    .sort((a, b) => a.order - b.order);
  const closingComponents = project.components
    .filter((c) => c.position === "closing")
    .sort((a, b) => a.order - b.order);

  const getStatusColor = (qa: (typeof qaReports)[0]) => {
    const hasName = qa.name.trim().length > 0;
    const hasContent = qa.content.trim().length > 0;
    if (hasName && hasContent) return "bg-green-500";
    if (hasName) return "bg-yellow-500";
    return "bg-gray-300 dark:bg-gray-600";
  };

  const isActiveComponent = (id: string) =>
    activeTab.type === "component" && activeTab.componentId === id;

  const isActiveQa = (id: string) =>
    activeTab.type === "report" && activeTab.qaId === id;

  return (
    <div className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Top action buttons */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
        <button
          onClick={addQa}
          className="w-full px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
        >
          + {t("sidebar.addReport", language)}
        </button>
        <button
          onClick={() => addComponent("opening")}
          className="w-full px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded transition-colors"
        >
          + {t("sidebar.addComponent", language)}
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Opening components */}
        {openingComponents.length > 0 && (
          <div className="p-2">
            <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t("editor.opening", language)}
            </div>
            {openingComponents.map((comp) => (
              <button
                key={comp.id}
                onClick={() => selectComponent(comp.id)}
                className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${
                  isActiveComponent(comp.id)
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="truncate">
                    {comp.name || t("editor.opening", language)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* QA Reports */}
        <div className="p-2">
          <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t("sidebar.reports", language)}
          </div>
          {qaReports.length === 0 ? (
            <p className="px-2 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">
              {t("sidebar.noQa", language)}
            </p>
          ) : (
            qaReports.map((qa, index) => (
              <div key={qa.id} className="group relative">
                <button
                  onClick={() => selectQa(qa.id)}
                  className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${
                    isActiveQa(qa.id)
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${getStatusColor(qa)}`}
                    />
                    <span className="truncate">
                      {qa.name || `${index + 1}. ${t("sidebar.unnamed", language)}`}
                    </span>
                  </span>
                </button>
                {/* Hover actions */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateQa(qa.id);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    title="Duplicate"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeQa(qa.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Closing components */}
        {closingComponents.length > 0 && (
          <div className="p-2">
            <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t("editor.closing", language)}
            </div>
            {closingComponents.map((comp) => (
              <button
                key={comp.id}
                onClick={() => selectComponent(comp.id)}
                className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${
                  isActiveComponent(comp.id)
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="truncate">
                    {comp.name || t("editor.closing", language)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom info bar */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400">
          <span>{t("sidebar.reports", language)}: {qaReports.length}</span>
          <span>{t("sidebar.components", language)}: {project.components.length}</span>
        </div>
        <div className="flex gap-1">
          {qaReports.some((q) => q.name.trim() === "" && q.content.trim() === "") && (
            <button
              onClick={removeEmptyQa}
              className="flex-1 px-2 py-1 text-[10px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            >
              {t("sidebar.removeEmpty", language)}
            </button>
          )}
          {qaReports.length > 0 && (
            <button
              onClick={removeAllQa}
              className="flex-1 px-2 py-1 text-[10px] text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
            >
              {t("sidebar.removeAll", language)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
