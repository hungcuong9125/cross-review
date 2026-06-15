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
    activeMainTab,
    activeItem,
    addQa,
    addComponent,
    updateQaName,
    updateQaContent,
    updateComponentName,
    updateComponentContent,
    removeComponent,
    moveComponentUp,
    moveComponentDown,
    language,
  } = useProjectStore();

  const selectedQa = project.qa_reports.find((q) => q.id === selectedQaId);
  const selectedIndex = selectedQa
    ? project.qa_reports.findIndex((q) => q.id === selectedQaId)
    : -1;

  // Get components for the current tab position
  const currentComponents = project.components
    .filter((c) => c.position === activeMainTab)
    .sort((a, b) => a.order - b.order);

  // Find the active component if we're viewing a component
  const activeComponent =
    activeItem?.type === "component"
      ? project.components.find((c) => c.id === activeItem.componentId)
      : null;

  // Check if the active component belongs to the current tab
  const activeCompInTab = activeComponent?.position === activeMainTab ? activeComponent : null;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {/* QA Reports tab */}
        {activeMainTab === "reports" && (
          <div className="h-full flex flex-col p-4">
            {!selectedQa ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-400 dark:text-gray-500 mb-3 text-sm">
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

        {/* Opening / Closing components tab */}
        {(activeMainTab === "opening" || activeMainTab === "closing") && (
          <div className="p-4 space-y-4">
            {currentComponents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 dark:text-gray-500 mb-3 text-sm">
                  {t("editor.noComponents", language)}
                </p>
                <button
                  onClick={() => addComponent(activeMainTab)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  + {t("editor.addComponentHere", language)}
                </button>
              </div>
            ) : (
              currentComponents.map((comp, index) => {
                const isActive = activeCompInTab?.id === comp.id;
                return (
                  <div
                    key={comp.id}
                    className={`border rounded-lg transition-colors ${
                      isActive
                        ? "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10"
                        : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                    }`}
                  >
                    {/* Component header */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                      <input
                        type="text"
                        value={comp.name}
                        onChange={(e) => updateComponentName(comp.id, e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1 bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none"
                        placeholder={t("editor.componentName", language)}
                      />
                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-semibold rounded uppercase ${
                          comp.position === "opening"
                            ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
                            : "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400"
                        }`}
                      >
                        {comp.position === "opening"
                          ? t("editor.opening", language)
                          : t("editor.closing", language)}
                      </span>

                      {/* Reorder buttons */}
                      <div className="flex gap-0.5">
                        <button
                          onClick={() => moveComponentUp(comp.id)}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors"
                          title={t("editor.moveUp", language)}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveComponentDown(comp.id)}
                          disabled={index === currentComponents.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors"
                          title={t("editor.moveDown", language)}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => removeComponent(comp.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title={t("editor.deleteComponent", language)}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Component content */}
                    <div className="p-3">
                      <textarea
                        value={comp.content}
                        onChange={(e) => updateComponentContent(comp.id, e.target.value)}
                        rows={4}
                        className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder={t("editor.componentContent", language)}
                      />
                      <div className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                        {comp.content.length.toLocaleString()}{" "}
                        {t("editor.chars", language)} ·{" "}
                        {countWords(comp.content).toLocaleString()}{" "}
                        {t("editor.words", language)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Add button at bottom */}
            {currentComponents.length > 0 && (
              <button
                onClick={() => addComponent(activeMainTab)}
                className="w-full py-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-400 dark:text-gray-500 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-500 transition-colors"
              >
                + {t("editor.addComponentHere", language)}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
