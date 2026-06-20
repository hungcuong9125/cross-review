import { useEffect, useState, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { EditorPanel } from "./components/EditorPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { ContentTabs } from "./components/ContentTabs";
import { ToastHost } from "./components/ToastHost";
import { Toolbar } from "./components/Toolbar";
import { useProjectStore } from "./state/projectStore";
import {
  saveProject,
  openProject,
} from "./lib/api";
import { useExportActions } from "./hooks/useExport";
import { sanitizeForStorage, recordScrubIfNeeded } from "./lib/sanitize";
import { toSlug } from "./lib/slug";
import { t } from "./lib/i18n";

function App() {
  const { project, setProject, newProject, darkMode, language, activeMainTab } =
    useProjectStore();
  const { handleExportTabMd } = useExportActions();

  const [rightSidebarWidth, setRightSidebarWidth] = useState(400);
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const handleSaveRef = useRef<() => void>(() => {});
  const handleOpenRef = useRef<() => void>(() => {});
  const handleExportMdRef = useRef<() => void>(() => {});

  const handleSave = async () => {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const slugTitle = project.title ? toSlug(project.title) : "";
      const path = await save({
        defaultPath: slugTitle
          ? `${slugTitle}.cross-review.json`
          : "project.cross-review.json",
        filters: [
          { name: "CrossReview Project", extensions: ["cross-review.json"] },
          { name: "JSON", extensions: ["json"] },
        ],
      });
      if (!path) return;
      await saveProject(project, path);
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
          { name: "CrossReview Project", extensions: ["cross-review.json"] },
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

  // Keep handler refs in sync with the latest closures.
  handleSaveRef.current = handleSave;
  handleOpenRef.current = handleOpen;
  handleExportMdRef.current = handleExportTabMd;

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

  useEffect(() => {
    return () => { cleanupDragRef.current?.(); };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const draftLoaded = useRef(false);
  useEffect(() => {
    const saved = localStorage.getItem("cross-review-draft");
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
    draftLoaded.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!draftLoaded.current) return;
    const timer = setTimeout(() => {
      try {
        const safe = sanitizeForStorage(project);
        localStorage.setItem("cross-review-draft", JSON.stringify(safe));
        recordScrubIfNeeded(project);
      } catch (err) {
        console.warn("Auto-save failed (localStorage quota exceeded):", err);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [project]);

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
          handleSaveRef.current();
          break;
        case "o":
          e.preventDefault();
          handleOpenRef.current();
          break;
        case "e":
          if (e.shiftKey) break;
          e.preventDefault();
          handleExportMdRef.current();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [language]);

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <Toolbar />
      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 flex-shrink-0 overflow-hidden">
          <Sidebar />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          {activeMainTab === "home" || activeMainTab === "debug" ? (
            <ContentTabs />
          ) : (
            <EditorPanel />
          )}
        </div>
        <div
          onMouseDown={handleMouseDown}
          className="w-1 cursor-col-resize hover:bg-blue-500 dark:hover:bg-blue-600 bg-gray-200 dark:bg-gray-700 transition-colors flex-shrink-0"
        />
        <div
          style={{ width: `${rightSidebarWidth}px` }}
          className="flex-shrink-0 flex flex-col overflow-hidden border-l border-gray-200 dark:border-gray-700"
        >
          <SettingsPanel />
        </div>
      </div>
      <ToastHost />
    </div>
  );
}

export default App;
