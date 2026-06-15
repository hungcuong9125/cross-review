import { useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { EditorPanel } from "./components/EditorPanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { ValidationChecklist } from "./components/ValidationChecklist";
import { Toolbar } from "./components/Toolbar";
import { useProjectStore } from "./state/projectStore";
import {
  saveProject,
  openProject,
  exportAllMarkdown,
} from "./lib/api";

function App() {
  const { project, setProject, newProject, darkMode, validation } =
    useProjectStore();

  // Apply dark mode class on mount and when it changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Load auto-saved draft on mount
  useEffect(() => {
    const saved = localStorage.getItem("qa-review-weaver-draft");
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft && draft.qa_reports) {
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
      localStorage.setItem("qa-review-weaver-draft", JSON.stringify(project));
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
          if (confirm("Tạo project mới? Dữ liệu chưa lưu sẽ bị mất.")) {
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
        case "c":
          if (e.shiftKey) {
            e.preventDefault();
            handleCopyPreview();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [project, validation]);

  const handleSave = async () => {
    try {
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
    }
  };

  const handleExportAll = async () => {
    if (!validation?.valid) return;
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const dir = await open({ directory: true, multiple: false });
      if (dir) {
        await exportAllMarkdown(project, dir as string);
      }
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  const handleCopyPreview = async () => {
    // Copy is handled by PreviewPanel's own button
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Top toolbar */}
      <Toolbar />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-56 flex-shrink-0 overflow-hidden">
          <Sidebar />
        </div>

        {/* Center editor */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <EditorPanel />
        </div>

        {/* Right preview panel */}
        <div className="w-[400px] flex-shrink-0 flex flex-col overflow-hidden border-l border-gray-200 dark:border-gray-700">
          <div className="flex-1 overflow-hidden">
            <PreviewPanel />
          </div>
          <ValidationChecklist />
        </div>
      </div>
    </div>
  );
}

export default App;
