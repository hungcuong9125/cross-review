import { useEffect, useState, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { EditorPanel } from "./components/EditorPanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { Toolbar } from "./components/Toolbar";
import { useProjectStore } from "./state/projectStore";
import {
  saveProject,
  openProject,
  exportAllMarkdown,
} from "./lib/api";
import { t } from "./lib/i18n";

function App() {
  const { project, setProject, newProject, darkMode, validation, language } =
    useProjectStore();

  const [rightSidebarWidth, setRightSidebarWidth] = useState(400);
  const cleanupDragRef = useRef<(() => void) | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightSidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = startWidth - deltaX;
      const minWidth = 400;
      const maxWidth = Math.max(minWidth, (window.innerWidth - 288) / 2);
      setRightSidebarWidth(Math.min(maxWidth, Math.max(minWidth, newWidth)));
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      cleanupDragRef.current = null;
    };

    cleanupDragRef.current = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Clean up drag listeners on unmount
  useEffect(() => {
    return () => { cleanupDragRef.current?.(); };
  }, []);

  // Apply dark mode class on mount and when it changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Load auto-saved draft on mount
  useEffect(() => {
    const saved = localStorage.getItem("review-weaver-draft");
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft && Array.isArray(draft.qa_reports) && Array.isArray(draft.components)) {
          setProject(draft);
        }
      } catch {
        // Ignore invalid saved state
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem("review-weaver-draft", JSON.stringify(project));
      } catch (err) {
        console.warn("Auto-save failed (localStorage quota exceeded):", err);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [project]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      switch (e.key.toLowerCase()) {
        case "n":
          e.preventDefault();
          if (confirm(t("dialog.confirmNew", language))) {
            newProject();
          }
          break;
        case "s":
          e.preventDefault();
          handleSave();
          break;
        case "o":
          e.preventDefault();
          handleOpen();
          break;
        case "e":
          if (e.shiftKey) break;
          e.preventDefault();
          handleExportAll();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [project, validation, language]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!validation?.valid) return;
    if (project.qa_reports.length === 0) return;
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

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Top toolbar with centered tabs */}
      <Toolbar />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-72 flex-shrink-0 overflow-hidden">
          <Sidebar />
        </div>

        {/* Center editor */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <EditorPanel />
        </div>

        {/* Resizer */}
        <div
          onMouseDown={handleMouseDown}
          className="w-1 cursor-col-resize hover:bg-blue-500 dark:hover:bg-blue-600 bg-gray-200 dark:bg-gray-700 transition-colors flex-shrink-0"
        />

        {/* Right preview panel */}
        <div
          style={{ width: `${rightSidebarWidth}px` }}
          className="flex-shrink-0 flex flex-col overflow-hidden border-l border-gray-200 dark:border-gray-700"
        >
          <div className="flex-1 overflow-hidden">
            <PreviewPanel />
          </div>
          <SettingsPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
