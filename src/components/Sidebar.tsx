import { useProjectStore } from "../state/projectStore";
import { t } from "../lib/i18n";
import { useToast } from "../hooks/useToast";
import { useExportActions } from "../hooks/useExport";

function CopyIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SidebarItem({
  name, fallbackName, active, isActive, toggleColor, activeTextClass, activeBgClass, onSelect, onToggle, onDuplicate, onDelete, duplicateHoverClass,
}: {
  name: string;
  fallbackName: string;
  active?: boolean;
  isActive: boolean;
  toggleColor: string;
  activeTextClass: string;
  activeBgClass: string;
  duplicateHoverClass: string;
  onSelect: () => void;
  onToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { language } = useProjectStore();
  return (
    <div className="group relative flex items-center gap-1.5">
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`w-6 h-3.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none flex-shrink-0 flex items-center ${active !== false ? toggleColor : "bg-gray-300 dark:bg-gray-600"}`}
        title={active !== false ? t("tooltip.disable", language) : t("tooltip.enable", language)}
      >
        <div className={`bg-white w-2.5 h-2.5 rounded-full shadow-sm transform duration-200 ${active !== false ? "translate-x-2.5" : "translate-x-0"}`} />
      </button>
      <button
        onClick={onSelect}
        className={`flex-1 text-left px-2.5 py-2 rounded-md text-sm transition-colors flex items-center gap-2 min-w-0 ${isActive ? `${activeTextClass} font-semibold ${activeBgClass}` : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30"} ${active === false ? "opacity-40 line-through text-gray-400" : ""}`}
      >
        <span className="truncate">{name || fallbackName}</span>
      </button>
      <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5">
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className={`p-1 text-gray-400 ${duplicateHoverClass} transition-colors`} title={t("tooltip.duplicate", language)}>
          <CopyIcon />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title={t("tooltip.delete", language)}>
          <DeleteIcon />
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const {
    project,
    activeItem,
    selectQa,
    selectComponent,
    addQa,
    removeQa,
    duplicateQa,
    removeAllQa,
    addComponent,
    language,
    toggleQaActive,
    toggleComponentActive,
    duplicateComponent,
    removeComponent,
  } = useProjectStore();

  const { success, error: toastError } = useToast();
  const { handleExportMd, handleExportZip } = useExportActions();

  const handleImport = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: true,
        filters: [
          { name: "Markdown & ZIP", extensions: ["md", "zip"] },
          { name: "Markdown", extensions: ["md"] },
          { name: "ZIP Archive", extensions: ["zip"] },
        ],
      });
      if (!selected) return;
      const files = Array.isArray(selected) ? selected : [selected];
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const { isValidSourceDocument } = await import("../lib/sanitize");
      const newReports: { id: string; name: string; content: string; active: boolean }[] = [];
      for (const filePath of files) {
        if (filePath.endsWith(".zip")) {
          const { readFile } = await import("@tauri-apps/plugin-fs");
          const zipData = await readFile(filePath);
          const { ZipReader, BlobReader, TextWriter } = await import("@zip.js/zip.js");
          const blob = new Blob([zipData]);
          const reader = new ZipReader(new BlobReader(blob));
          const entries = await reader.getEntries();
          for (const entry of entries) {
            if (entry.filename.endsWith(".md") && !entry.directory && entry.getData) {
              const text = await entry.getData(new TextWriter());
              if (!isValidSourceDocument(entry.filename, text)) {
                alert(language === "vi"
                  ? `Tệp tin "${entry.filename}" bên trong file ZIP không đúng định dạng tài liệu nguồn!`
                  : `File "${entry.filename}" inside ZIP is not a valid source document!`);
                continue;
              }
              const name = entry.filename.replace(/\.md$/, "").replace(/[_-]/g, " ");
              newReports.push({ id: crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 11), name, content: text, active: true });
            }
          }
          await reader.close();
        } else if (filePath.endsWith(".md")) {
          const text = await readTextFile(filePath);
          const baseName = filePath.split(/[/\\]/).pop() || "Imported";
          if (!isValidSourceDocument(baseName, text)) {
            alert(language === "vi"
              ? `Tệp tin "${baseName}" không đúng định dạng tài liệu nguồn!`
              : `File "${baseName}" is not a valid source document!`);
            continue;
          }
          const name = baseName.replace(/\.md$/, "").replace(/[_-]/g, " ");
          newReports.push({ id: crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 11), name, content: text, active: true });
        }
      }
      if (newReports.length > 0) {
        useProjectStore.setState((state) => ({
          project: { ...state.project, qa_reports: [...state.project.qa_reports, ...newReports] },
        }));
        useProjectStore.getState().refreshValidation();
        success(`Imported ${newReports.length} file(s)`);
      }
    } catch (err) { toastError(`Import failed: ${err}`); }
  };

  const qaReports = project.qa_reports;
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
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
        <button
          onClick={addQa}
          className="w-full px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
        >
          + {t("sidebar.addReport", language)}
        </button>
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
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {qaReports.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
              {t("preview.reports", language)}
            </div>
            <div className="space-y-0">
              {qaReports.map((qa) => (
                <SidebarItem
                  key={qa.id}
                  name={qa.name}
                  fallbackName={t("sidebar.unnamed", language)}
                  active={qa.active}
                  isActive={isActive(qa.id, "report")}
                  toggleColor="bg-blue-500"
                  activeTextClass="text-blue-600 dark:text-blue-400"
                  activeBgClass="bg-blue-50/60 dark:bg-blue-950/20"
                  duplicateHoverClass="hover:text-blue-500"
                  onSelect={() => selectQa(qa.id)}
                  onToggle={() => toggleQaActive(qa.id)}
                  onDuplicate={() => duplicateQa(qa.id)}
                  onDelete={() => removeQa(qa.id)}
                />
              ))}
            </div>
          </div>
        )}
        {openingComps.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
              {t("editor.opening", language)}
            </div>
            <div className="space-y-0">
              {openingComps.map((comp) => (
                <SidebarItem
                  key={comp.id}
                  name={comp.name}
                  fallbackName={t("editor.opening", language)}
                  active={comp.active}
                  isActive={isActive(comp.id, "component")}
                  toggleColor="bg-purple-500"
                  activeTextClass="text-purple-600 dark:text-purple-400"
                  activeBgClass="bg-purple-50/60 dark:bg-purple-950/20"
                  duplicateHoverClass="hover:text-purple-500"
                  onSelect={() => selectComponent(comp.id)}
                  onToggle={() => toggleComponentActive(comp.id)}
                  onDuplicate={() => duplicateComponent(comp.id)}
                  onDelete={() => removeComponent(comp.id)}
                />
              ))}
            </div>
          </div>
        )}
        {closingComps.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
              {t("editor.closing", language)}
            </div>
            <div className="space-y-0">
              {closingComps.map((comp) => (
                <SidebarItem
                  key={comp.id}
                  name={comp.name}
                  fallbackName={t("editor.closing", language)}
                  active={comp.active}
                  isActive={isActive(comp.id, "component")}
                  toggleColor="bg-orange-500"
                  activeTextClass="text-orange-600 dark:text-orange-400"
                  activeBgClass="bg-orange-50/60 dark:bg-orange-950/20"
                  duplicateHoverClass="hover:text-orange-500"
                  onSelect={() => selectComponent(comp.id)}
                  onToggle={() => toggleComponentActive(comp.id)}
                  onDuplicate={() => duplicateComponent(comp.id)}
                  onDelete={() => removeComponent(comp.id)}
                />
              ))}
            </div>
          </div>
        )}
        {qaReports.length === 0 && openingComps.length === 0 && closingComps.length === 0 && (
          <p className="px-2 py-8 text-xs text-gray-400 dark:text-gray-500 text-center">
            {t("sidebar.noQa", language)}
          </p>
        )}
      </div>
      <div className="p-2.5 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={handleExportMd} className="px-2 py-1.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors">
            {t("footer.exportMd", language)}
          </button>
          <button onClick={handleExportZip} className="px-2 py-1.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors">
            {t("footer.exportZip", language)}
          </button>
          <button onClick={handleImport} className="px-2 py-1.5 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors">
            {t("footer.import", language)}
          </button>
          <button
            onClick={() => {
              if (confirm(t("dialog.confirmRemoveAll", language))) {
                removeAllQa();
              }
            }}
            className="px-2 py-1.5 text-[11px] font-medium text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
          >
            {t("sidebar.removeAll", language)}
          </button>
        </div>
      </div>
    </div>
  );
}
