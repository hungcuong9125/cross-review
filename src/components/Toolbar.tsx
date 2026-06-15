import { useProjectStore } from "../state/projectStore";
import {
  saveProject,
  openProject,
  exportAllMarkdown,
  exportAllZip,
} from "../lib/api";

export function Toolbar() {
  const { project, setProject, newProject, setProjectTitle, darkMode, toggleDarkMode, validation } =
    useProjectStore();

  const canExport = validation?.valid ?? false;

  const handleNew = () => {
    if (confirm("Tạo project mới? Dữ liệu chưa lưu sẽ bị mất.")) {
      newProject();
    }
  };

  const handleSave = async () => {
    try {
      // Use Tauri dialog to pick save location
      const { save } = await import("@tauri-apps/plugin-dialog");
      const path = await save({
        defaultPath: project.title
          ? `${project.title.toLowerCase().replace(/\s+/g, "-")}.qa-review-weaver.json`
          : "project.qa-review-weaver.json",
        filters: [
          { name: "QA Review Weaver Project", extensions: ["qa-review-weaver.json"] },
          { name: "JSON", extensions: ["json"] },
        ],
      });
      if (path) {
        await saveProject(project, path);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert(`Lỗi lưu project: ${err}`);
    }
  };

  const handleOpen = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [
          { name: "QA Review Weaver Project", extensions: ["qa-review-weaver.json"] },
          { name: "JSON", extensions: ["json"] },
        ],
      });
      if (selected) {
        const loaded = await openProject(selected as string);
        setProject(loaded);
      }
    } catch (err) {
      console.error("Open error:", err);
      alert(`Lỗi mở project: ${err}`);
    }
  };

  const handleExportAll = async () => {
    if (!canExport) {
      alert("Vui lòng hoàn thiện tất cả kiểm tra trước khi export.");
      return;
    }
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const dir = await open({ directory: true, multiple: false });
      if (dir) {
        const paths = await exportAllMarkdown(project, dir as string);
        alert(`Đã export ${paths.length} file thành công!`);
      }
    } catch (err) {
      console.error("Export error:", err);
      alert(`Lỗi export: ${err}`);
    }
  };

  const handleExportZip = async () => {
    if (!canExport) {
      alert("Vui lòng hoàn thiện tất cả kiểm tra trước khi export.");
      return;
    }
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const defaultName = project.title
        ? `${project.title.toLowerCase().replace(/\s+/g, "-")}-reviews.zip`
        : "qa-review-weaver-export.zip";
      const path = await save({
        defaultPath: defaultName,
        filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
      });
      if (path) {
        await exportAllZip(project, path);
        alert(`Đã export zip thành công: ${path}`);
      }
    } catch (err) {
      console.error("Zip export error:", err);
      alert(`Lỗi export zip: ${err}`);
    }
  };

  return (
    <div className="h-12 flex items-center justify-between px-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Left: project title */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <h1 className="text-sm font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">
          QA Review Weaver
        </h1>
        <input
          type="text"
          value={project.title}
          onChange={(e) => setProjectTitle(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1 bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:outline-none text-sm text-gray-600 dark:text-gray-300 transition-colors"
          placeholder="Tên project (tuỳ chọn)"
        />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 ml-4">
        <ToolbarButton onClick={handleNew} title="Ctrl/Cmd + N">
          Mới
        </ToolbarButton>
        <ToolbarButton onClick={handleOpen} title="Ctrl/Cmd + O">
          Mở
        </ToolbarButton>
        <ToolbarButton onClick={handleSave} title="Ctrl/Cmd + S">
          Lưu
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />
        <ToolbarButton
          onClick={handleExportAll}
          disabled={!canExport}
          title="Ctrl/Cmd + E"
        >
          Export .md
        </ToolbarButton>
        <ToolbarButton
          onClick={handleExportZip}
          disabled={!canExport}
          title="Export ZIP"
        >
          Export .zip
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />
        <button
          onClick={toggleDarkMode}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          title="Toggle dark mode"
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
