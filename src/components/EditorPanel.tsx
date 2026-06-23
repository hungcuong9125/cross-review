import { useEffect } from "react";
import type { Component } from "../lib/api";
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

  const openingComponents = project.components
    .filter((c) => c.position === "opening")
    .sort((a, b) => a.order - b.order);

  const closingComponents = project.components
    .filter((c) => c.position === "closing")
    .sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (activeItem?.type !== "component") return;

    const id = `comp-card-${activeItem.componentId}`;
    let attempts = 0;
    const maxAttempts = 15;
    let rafId: number;

    function tryScroll() {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else if (++attempts < maxAttempts) {
        rafId = requestAnimationFrame(tryScroll);
      }
    }
    // First try immediately; the element may already be in the DOM
    rafId = requestAnimationFrame(tryScroll);
    return () => cancelAnimationFrame(rafId);
  }, [activeItem?.type === "component" ? activeItem.componentId : null]);

  const renderComponentCard = (comp: Component, index: number, list: Component[]) => {
    const isItemActive = activeItem?.type === "component" && activeItem.componentId === comp.id;
    return (
      <div
        key={comp.id}
        id={`comp-card-${comp.id}`}
        className={`bg-white dark:bg-gray-800 border rounded-lg shadow-sm transition-all duration-200 ${
          isItemActive
            ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md"
            : "border-gray-200 dark:border-gray-700"
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            value={comp.name}
            onChange={(e) => updateComponentName(comp.id, e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-gray-800 dark:text-gray-100 focus:outline-none placeholder-gray-400"
            placeholder={`${t("editor.componentName", language)} *`}
          />

          {/* Reorder buttons */}
          <div className="flex gap-0.5 ml-2">
            <button
              onClick={() => moveComponentUp(comp.id)}
              disabled={index === 0}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors"
              title={t("editor.moveUp", language)}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={() => moveComponentDown(comp.id)}
              disabled={index === list.length - 1}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors"
              title={t("editor.moveDown", language)}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={() => removeComponent(comp.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              title={t("editor.deleteComponent", language)}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 select-none">
              {t("editor.componentContent", language)}
            </label>
          </div>
          <textarea
            value={comp.content}
            onChange={(e) => updateComponentContent(comp.id, e.target.value)}
            rows={5}
            className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg resize-y focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-sm text-gray-800 dark:text-gray-100 leading-relaxed"
            placeholder={t("editor.componentContent", language)}
          />
          <div className="mt-3 flex items-center justify-between text-[10px] font-medium text-gray-400 dark:text-gray-500 select-none">
            <div>
              <span>{comp.content.length.toLocaleString()} {t("editor.chars", language)}</span>
              <span className="mx-2">·</span>
              <span>{countWords(comp.content).toLocaleString()} {t("editor.words", language)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto">
        {/* QA Reports tab */}
        {activeMainTab === "reports" && (
          <div className="h-full flex flex-col">
            {!selectedQa ? (
              <div className="flex-1 flex items-center justify-center p-6 bg-gray-50/50 dark:bg-gray-900/30">
                <div className="text-center">
                  <p className="text-gray-400 dark:text-gray-500 mb-3 text-sm">
                    {t("editor.selectQa", language)}
                  </p>
                  <button
                    onClick={addQa}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    + {t("sidebar.addReport", language)}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col p-5 gap-5 overflow-y-auto">
                {/* Source Card */}
                <div
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex-1 flex flex-col min-h-[400px] transition-all duration-200"
                >
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <input
                      type="text"
                      value={selectedQa.name}
                      onChange={(e) => updateQaName(selectedQa.id, e.target.value)}
                      className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-gray-800 dark:text-gray-100 focus:outline-none placeholder-gray-400"
                      placeholder={t("editor.sourceNamePlaceholder", language)}
                    />
                  </div>

                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 select-none mb-2">
                        {t("editor.sourceContentLabel", language)}
                      </label>
                      <button
                        onClick={() => updateQaContent(selectedQa.id, "")}
                        className="text-xs font-semibold text-red-400 hover:text-red-500 transition-colors"
                        title={t("editor.clearTooltip", language)}
                      >
                        {t("editor.clear", language)}
                      </button>
                    </div>
                    <textarea
                      value={selectedQa.content}
                      onChange={(e) =>
                        updateQaContent(selectedQa.id, e.target.value)
                      }
                      className="flex-1 w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-sm text-gray-800 dark:text-gray-100 leading-relaxed"
                      placeholder={t("editor.sourceContentPlaceholder", language)}
                    />
                    <div className="mt-3 flex items-center justify-between text-[10px] font-medium text-gray-400 dark:text-gray-500 select-none">
                      <div>
                        <span>{selectedQa.content.length.toLocaleString()} {t("editor.chars", language)}</span>
                        <span className="mx-2">·</span>
                        <span>{countWords(selectedQa.content).toLocaleString()} {t("editor.words", language)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Unified Components tab */}
        {activeMainTab === "components" && (
          <div className="p-5 space-y-8 overflow-y-auto h-full bg-gray-50 dark:bg-gray-900">
            {/* Opening Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                  {t("editor.opening", language)}
                </h3>
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                  {openingComponents.length} {t("editor.componentsCount", language)}
                </span>
              </div>

              {openingComponents.length === 0 ? (
                <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-gray-400 dark:text-gray-400 mb-3 text-sm">
                    {t("editor.noOpening", language)}
                  </p>
                  <button
                    onClick={() => addComponent("opening")}
                    className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors shadow-sm"
                  >
                    + {t("editor.addComponentHere", language)}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {openingComponents.map((comp, index) => renderComponentCard(comp, index, openingComponents))}
                  <button
                    onClick={() => addComponent("opening")}
                    className="w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-400 dark:text-gray-500 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-500 transition-colors bg-white dark:bg-gray-800 shadow-sm"
                  >
                    + {t("editor.addOpeningComponent", language)}
                  </button>
                </div>
              )}
            </div>

            {/* Closing Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <h3 className="text-xs font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  {t("editor.closing", language)}
                </h3>
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                  {closingComponents.length} {t("editor.componentsCount", language)}
                </span>
              </div>

              {closingComponents.length === 0 ? (
                <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-gray-400 dark:text-gray-400 mb-3 text-sm">
                    {t("editor.noClosing", language)}
                  </p>
                  <button
                    onClick={() => addComponent("closing")}
                    className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors shadow-sm"
                  >
                    + {t("editor.addComponentHere", language)}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {closingComponents.map((comp, index) => renderComponentCard(comp, index, closingComponents))}
                  <button
                    onClick={() => addComponent("closing")}
                    className="w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-400 dark:text-gray-500 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-500 transition-colors bg-white dark:bg-gray-800 shadow-sm"
                  >
                    + {t("editor.addClosingComponent", language)}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
