import { useProjectStore } from "../state/projectStore";
import { t } from "../lib/i18n";

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

export function EditorPanel() {
  const {
    project,
    selectedQaId,
    activeTab,
    selectQa,
    selectComponent,
    addQa,
    updateQaName,
    updateQaContent,
    updateComponentName,
    updateComponentContent,
    removeComponent,
    language,
  } = useProjectStore();

  const selectedQa = project.qa_reports.find((q) => q.id === selectedQaId);
  const selectedIndex = selectedQa
    ? project.qa_reports.findIndex((q) => q.id === selectedQaId)
    : -1;

  const activeComponent =
    activeTab.type === "component"
      ? project.components.find((c) => c.id === activeTab.componentId)
      : null;

  // Build tab list: all components + reports tab
  const openingComps = project.components
    .filter((c) => c.position === "opening")
    .sort((a, b) => a.order - b.order);
  const closingComps = project.components
    .filter((c) => c.position === "closing")
    .sort((a, b) => a.order - b.order);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {/* Opening component tabs */}
        {openingComps.map((comp) => (
          <button
            key={comp.id}
            onClick={() => selectComponent(comp.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab.type === "component" && activeTab.componentId === comp.id
                ? "border-purple-500 text-purple-600 dark:text-purple-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {comp.name || t("editor.opening", language)}
          </button>
        ))}

        {/* Reports tab */}
        <button
          onClick={() => {
            if (selectedQaId) {
              selectQa(selectedQaId);
            } else if (project.qa_reports.length > 0) {
              selectQa(project.qa_reports[0].id);
            }
          }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab.type === "report"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          {t("editor.qaReport", language)}
          {selectedQa ? ` (${selectedQa.name || selectedIndex + 1})` : ""}
        </button>

        {/* Closing component tabs */}
        {closingComps.map((comp) => (
          <button
            key={comp.id}
            onClick={() => selectComponent(comp.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab.type === "component" && activeTab.componentId === comp.id
                ? "border-orange-500 text-orange-600 dark:text-orange-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {comp.name || t("editor.closing", language)}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {/* Component editor */}
        {activeTab.type === "component" && activeComponent && (
          <div className="h-full flex flex-col p-4">
            {/* Component name + position */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t("editor.componentName", language)}
                </label>
                <input
                  type="text"
                  value={activeComponent.name}
                  onChange={(e) =>
                    updateComponentName(activeComponent.id, e.target.value)
                  }
                  className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder={t("editor.componentName", language)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t("editor.position", language)}
                </label>
                <span
                  className={`inline-block px-3 py-1.5 text-xs rounded ${
                    activeComponent.position === "opening"
                      ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                      : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                  }`}
                >
                  {activeComponent.position === "opening"
                    ? t("editor.atOpening", language)
                    : t("editor.atClosing", language)}
                </span>
              </div>
              <button
                onClick={() => removeComponent(activeComponent.id)}
                className="mt-5 p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                title={t("editor.deleteComponent", language)}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* Component content */}
            <div className="flex-1 flex flex-col">
              <textarea
                value={activeComponent.content}
                onChange={(e) =>
                  updateComponentContent(activeComponent.id, e.target.value)
                }
                className="flex-1 w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder={t("editor.componentContent", language)}
              />
              <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                {activeComponent.content.length.toLocaleString()}{" "}
                {t("editor.chars", language)} ·{" "}
                {countWords(activeComponent.content).toLocaleString()}{" "}
                {t("editor.words", language)}
              </div>
            </div>
          </div>
        )}

        {/* QA Report editor */}
        {activeTab.type === "report" && (
          <div className="h-full flex flex-col p-4">
            {!selectedQa ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-400 dark:text-gray-500 mb-3">
                    {t("editor.selectQa", language)}
                  </p>
                  <button
                    onClick={addQa}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    + {t("sidebar.addReport", language)}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* QA name input */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {t("editor.namePlaceholder", language)}
                  </label>
                  <input
                    type="text"
                    value={selectedQa.name}
                    onChange={(e) => updateQaName(selectedQa.id, e.target.value)}
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder={`QA ${selectedIndex + 1}`}
                  />
                </div>

                {/* Content textarea */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs text-gray-500 dark:text-gray-400">
                      {t("editor.contentPlaceholder", language)}
                    </label>
                    <button
                      onClick={() => updateQaContent(selectedQa.id, "")}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      title="Clear content"
                    >
                      {t("editor.clear", language)}
                    </button>
                  </div>
                  <textarea
                    value={selectedQa.content}
                    onChange={(e) =>
                      updateQaContent(selectedQa.id, e.target.value)
                    }
                    className="flex-1 w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder={t("editor.contentPlaceholder", language)}
                  />
                  <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    {selectedQa.content.length.toLocaleString()}{" "}
                    {t("editor.chars", language)} ·{" "}
                    {countWords(selectedQa.content).toLocaleString()}{" "}
                    {t("editor.words", language)}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
