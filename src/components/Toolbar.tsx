import { useProjectStore } from "../state/projectStore";
import {
  saveProject,
  openProject,
  exportAllMarkdown,
  exportAllZip,
} from "../lib/api";
import { t } from "../lib/i18n";

export function Toolbar() {
  const { project, setProject, newProject, setProjectTitle, darkMode, toggleDarkMode, validation, language } =
    useProjectStore();

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
          ? `${project.title.toLowerCase().replace(/\s+/g, "-")}.review-weaver.json`
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
        ? `${project.title.toLowerCase().replace(/\s+/g, "-")}-reviews.zip`
        : "review-weaver-export.zip";
      const path = await save({
        defaultPath: defaultName,
        filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
      });
      if (path) {
        await exportAllZip(project, path);
        alert(`${t("dialog.exportSuccess", language)}: ${path}`);
      }
    } catch (err) {
      console.error("Zip export error:", err);
      alert(`${t("dialog.exportFail", language)}: ${err}`);
    }
  };

  return (
    <div className="h-12 flex items-center justify-between px-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Left: project title */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <h1 className="text-sm font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">
          Review Weaver
        </h1>
        <input
          type="text"
          value={project.title}
          onChange={(e) => setProjectTitle(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1 bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:outline-none text-sm text-gray-600 dark:text-gray-300 transition-colors"
          placeholder={t("toolbar.projectTitle", language)}
        />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 ml-4">
        <ToolbarButton onClick={handleNew} title="Ctrl/Cmd + N">
          {t("toolbar.new", language)}
        </ToolbarButton>
        <ToolbarButton onClick={handleOpen} title="Ctrl/Cmd + O">
          {t("toolbar.open", language)}
        </ToolbarButton>
        <ToolbarButton onClick={handleSave} title="Ctrl/Cmd + S">
          {t("toolbar.save", language)}
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />
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
          title="Export ZIP"
        >
          {t("toolbar.exportZip", language)}
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />
        <button
          onClick={toggleDarkMode}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
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
      className="px-2.5 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
