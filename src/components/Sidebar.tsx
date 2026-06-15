import { useProjectStore } from "../state/projectStore";
import { t } from "../lib/i18n";

export function Sidebar() {
  const {
    project,
    activeItem,
    selectQa,
    selectComponent,
    addQa,
    removeQa,
    duplicateQa,
    removeEmptyQa,
    removeAllQa,
    addComponent,
    language,
    toggleQaActive,
    toggleComponentActive,
    duplicateComponent,
    removeComponent,
  } = useProjectStore();

  const qaReports = project.qa_reports;

  // Build unified list: opening components, QA reports, closing components
  const openingComps = project.components
    .filter((c) => c.position === "opening")
    .sort((a, b) => a.order - b.order);
  const closingComps = project.components
    .filter((c) => c.position === "closing")
    .sort((a, b) => a.order - b.order);

  const isActive = (id: string, type: "report" | "component") => {
    if (!activeItem || activeItem.type !== type) return false;
    if (type === "report" && activeItem.type === "report") return activeItem.qaId === id;
    if (type === "component" && activeItem.type === "component") return activeItem.componentId === id;
    return false;
  };

  return (
    <div className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Top action buttons */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
        {/* Row 1: Add report - full width */}
        <button
          onClick={addQa}
          className="w-full px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
        >
          + {t("sidebar.addReport", language)}
        </button>
        {/* Row 2: Add opening + Add closing - side by side */}
        <div className="flex gap-1.5">
          <button
            onClick={() => addComponent("opening")}
            className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-[11px] rounded transition-colors"
          >
            + {t("sidebar.addOpening", language)}
          </button>
          <button
            onClick={() => addComponent("closing")}
            className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-[11px] rounded transition-colors"
          >
            + {t("sidebar.addClosing", language)}
          </button>
        </div>
      </div>

      {/* Unified scrollable list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* QA Reports Group */}
        {qaReports.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
              {t("preview.reports", language)}
            </div>
            <div className="space-y-0">
              {qaReports.map((qa) => (
                <div key={qa.id} className="group relative flex items-center gap-1.5">
                  {/* Toggle Switch */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleQaActive(qa.id);
                    }}
                    className={`w-6 h-3.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none flex-shrink-0 flex items-center ${qa.active !== false
                      ? "bg-blue-500"
                      : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    title={qa.active !== false ? "Disable" : "Enable"}
                  >
                    <div
                      className={`bg-white w-2.5 h-2.5 rounded-full shadow-sm transform duration-200 ${qa.active !== false ? "translate-x-2.5" : "translate-x-0"
                        }`}
                    />
                  </button>

                  <button
                    onClick={() => selectQa(qa.id)}
                    className={`flex-1 text-left px-2.5 py-2 rounded-md text-sm transition-colors flex items-center gap-2 min-w-0 ${isActive(qa.id, "report")
                      ? "text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/60 dark:bg-blue-950/20"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      } ${qa.active === false ? "opacity-40 line-through text-gray-400" : ""}`}
                  >
                    <span className="truncate">
                      {qa.name || t("sidebar.unnamed", language)}
                    </span>
                  </button>

                  {/* Hover actions */}
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5">
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
              ))}
            </div>
          </div>
        )}

        {/* Opening Components Group */}
        {openingComps.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
              {t("editor.opening", language)}
            </div>
            <div className="space-y-0">
              {openingComps.map((comp) => (
                <div key={comp.id} className="group relative flex items-center gap-1.5">
                  {/* Toggle Switch */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleComponentActive(comp.id);
                    }}
                    className={`w-6 h-3.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none flex-shrink-0 flex items-center ${comp.active !== false
                      ? "bg-purple-500"
                      : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    title={comp.active !== false ? "Disable" : "Enable"}
                  >
                    <div
                      className={`bg-white w-2.5 h-2.5 rounded-full shadow-sm transform duration-200 ${comp.active !== false ? "translate-x-2.5" : "translate-x-0"
                        }`}
                    />
                  </button>

                  <button
                    onClick={() => selectComponent(comp.id)}
                    className={`flex-1 text-left px-2.5 py-2 rounded-md text-sm transition-colors flex items-center gap-2 min-w-0 ${isActive(comp.id, "component")
                      ? "text-purple-600 dark:text-purple-400 font-semibold bg-purple-50/60 dark:bg-purple-950/20"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      } ${comp.active === false ? "opacity-40 line-through text-gray-400" : ""}`}
                  >
                    <span className="truncate">
                      {comp.name || t("editor.opening", language)}
                    </span>
                  </button>

                  {/* Hover actions */}
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateComponent(comp.id);
                      }}
                      className="p-1 text-gray-400 hover:text-purple-500 transition-colors"
                      title="Duplicate"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeComponent(comp.id);
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
              ))}
            </div>
          </div>
        )}

        {/* Closing Components Group */}
        {closingComps.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
              {t("editor.closing", language)}
            </div>
            <div className="space-y-0">
              {closingComps.map((comp) => (
                <div key={comp.id} className="group relative flex items-center gap-1.5">
                  {/* Toggle Switch */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleComponentActive(comp.id);
                    }}
                    className={`w-6 h-3.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none flex-shrink-0 flex items-center ${comp.active !== false
                      ? "bg-orange-500"
                      : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    title={comp.active !== false ? "Disable" : "Enable"}
                  >
                    <div
                      className={`bg-white w-2.5 h-2.5 rounded-full shadow-sm transform duration-200 ${comp.active !== false ? "translate-x-2.5" : "translate-x-0"
                        }`}
                    />
                  </button>

                  <button
                    onClick={() => selectComponent(comp.id)}
                    className={`flex-1 text-left px-2.5 py-2 rounded-md text-sm transition-colors flex items-center gap-2 min-w-0 ${isActive(comp.id, "component")
                      ? "text-orange-600 dark:text-orange-400 font-semibold bg-orange-50/60 dark:bg-orange-950/20"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      } ${comp.active === false ? "opacity-40 line-through text-gray-400" : ""}`}
                  >
                    <span className="truncate">
                      {comp.name || t("editor.closing", language)}
                    </span>
                  </button>

                  {/* Hover actions */}
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateComponent(comp.id);
                      }}
                      className="p-1 text-gray-400 hover:text-orange-500 transition-colors"
                      title="Duplicate"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeComponent(comp.id);
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
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {qaReports.length === 0 && openingComps.length === 0 && closingComps.length === 0 && (
          <p className="px-2 py-8 text-xs text-gray-400 dark:text-gray-500 text-center">
            {t("sidebar.noQa", language)}
          </p>
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
