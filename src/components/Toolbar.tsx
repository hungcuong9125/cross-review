import { useProjectStore, type MainTab } from "../state/projectStore";
import {
  saveProject,
  openProject,
  exportAllMarkdown,
  exportAllZip,
} from "../lib/api";
import { t } from "../lib/i18n";

// SVG icons for tabs
const TabIcons = {
  home: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
    </svg>
  ),
  reports: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  opening: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  ),
  closing: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
    </svg>
  ),
};

export function Toolbar() {
  const {
    project, setProject, newProject, setProjectTitle,
    darkMode, toggleDarkMode, validation, language,
    activeMainTab, setActiveMainTab,
    contentTabs, activeContentTabId,
  } = useProjectStore();

  const canExport = validation?.valid ?? false;

  const handleNew = () => {
    if (confirm(t("dialog.confirmNew", language))) {
      newProject();
    }
  };

  const handleSave = async () => {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const path = await save({
        defaultPath: project.title
          ? `${project.title.toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/-{2,}/g, "-")}.review-weaver.json`
          : "project.review-weaver.json",
        filters: [
          { name: "Review Weaver Project", extensions: ["review-weaver.json"] },
          { name: "JSON", extensions: ["json"] },
        ],
      });
      if (path) {
        await saveProject(project, path);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert(`${t("dialog.saveFail", language)}: ${err}`);
    }
  };

  const handleOpen = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [
          { name: "Review Weaver Project", extensions: ["review-weaver.json"] },
          { name: "JSON", extensions: ["json"] },
        ],
      });
      if (selected) {
        const loaded = await openProject(selected as string);
        setProject(loaded);
      }
    } catch (err) {
      console.error("Open error:", err);
      alert(`${t("dialog.openFail", language)}: ${err}`);
    }
  };

  const handleExportAll = async () => {
    if (!canExport) {
      alert(t("dialog.validationFail", language));
      return;
    }
    if (project.qa_reports.length === 0) {
      alert(t("dialog.noReport", language));
      return;
    }
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const dir = await open({ directory: true, multiple: false });
      if (dir) {
        const paths = await exportAllMarkdown(project, dir as string);
        alert(`${t("dialog.exportSuccess", language)}: ${paths.length} files`);
      }
    } catch (err) {
      console.error("Export error:", err);
      alert(`${t("dialog.exportFail", language)}: ${err}`);
    }
  };

  const handleExportZip = async () => {
    if (!canExport) {
      alert(t("dialog.validationFail", language));
      return;
    }
    if (project.qa_reports.length === 0) {
      alert(t("dialog.noReport", language));
      return;
    }
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const defaultName = project.title
        ? `${project.title.toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/-{2,}/g, "-")}-reviews.zip`
        : "review-weaver-export.zip";
      const path = await save({
        defaultPath: defaultName,
        filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
      });
      if (path) {
        const result = await exportAllZip(project, path);
        alert(`${t("dialog.exportSuccess", language)}: ${result}`);
      }
    } catch (err) {
      console.error("Zip export error:", err);
      alert(`${t("dialog.exportFail", language)}: ${err}`);
    }
  };

  const showAiBadge = contentTabs.length > 1 && activeContentTabId === "preview";

  const mainTabs: { key: MainTab; label: string; icon: React.ReactNode; badge?: boolean }[] = [
    { key: "home", label: t("tab.home", language), icon: TabIcons.home, badge: showAiBadge },
    { key: "reports", label: t("sidebar.reports", language), icon: TabIcons.reports },
    { key: "opening", label: t("editor.opening", language), icon: TabIcons.opening },
    { key: "closing", label: t("editor.closing", language), icon: TabIcons.closing },
  ];

  return (
    <div className="h-14 flex items-center px-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Left: project title - matches sidebar width */}
      <div className="min-w-0 w-72">
        <input
          type="text"
          value={project.title}
          onChange={(e) => setProjectTitle(e.target.value)}
          className="w-full py-1 bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:outline-none text-xs text-gray-700 dark:text-gray-200 transition-colors"
          placeholder={t("toolbar.projectTitle", language)}
        />
      </div>

      {/* Center: main tabs - separated buttons style */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-2">
          {mainTabs.map((tab) => {
            const isActive = activeMainTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveMainTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg border transition-all duration-200 ${isActive
                    ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "bg-gray-50/60 dark:bg-gray-800/30 border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-700/50"
                  }`}
              >
                <span className={isActive ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}>
                  {tab.icon}
                </span>
                {tab.badge && (
                  <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-blue-500" title="AI tabs available" />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 w-auto">
        <ToolbarButton onClick={handleNew} title="Ctrl/Cmd + N">
          {t("toolbar.new", language)}
        </ToolbarButton>
        <ToolbarButton onClick={handleOpen} title="Ctrl/Cmd + O">
          {t("toolbar.open", language)}
        </ToolbarButton>
        <ToolbarButton onClick={handleSave} title="Ctrl/Cmd + S">
          {t("toolbar.save", language)}
        </ToolbarButton>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5" />
        <ToolbarButton
          onClick={handleExportAll}
          disabled={!canExport}
          title="Ctrl/Cmd + E"
        >
          {t("toolbar.exportMd", language)}
        </ToolbarButton>
        <ToolbarButton
          onClick={handleExportZip}
          disabled={!canExport}
          title={t("tooltip.exportZip", language)}
        >
          {t("toolbar.exportZip", language)}
        </ToolbarButton>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5" />
        <button
          onClick={toggleDarkMode}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          title={darkMode ? t("toolbar.lightMode", language) : t("toolbar.darkMode", language)}
        >
          {darkMode ? "☀️" : "🌙"}
        </button>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="px-2.5 py-1 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
