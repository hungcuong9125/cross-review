import { useCallback } from "react";
import { exportSingleMarkdown, exportSingleZip } from "../lib/api";
import { useToast } from "./useToast";
import { t } from "../lib/i18n";
import { useProjectStore } from "../state/projectStore";

export function useExportActions() {
  const { success, error: toastError, info } = useToast();
  const {
    activeContentTabId,
    contentTabs,
    previewMarkdown,
    previewFilename,
    processContent,
    validation,
    language,
  } = useProjectStore();

  const handleExportMd = useCallback(async () => {
    const activeTab = contentTabs.find((tab) => tab.id === activeContentTabId);
    if (!activeTab || (activeTab.kind !== "preview" && activeTab.kind !== "ai")) {
      info(t("dialog.noReport", language));
      return;
    }

    if (activeTab.kind === "preview" && validation && !validation.valid) {
      info(t("dialog.validationFail", language));
      return;
    }

    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      
      const defaultName = activeTab.kind === "preview"
        ? (previewFilename || "preview.md")
        : activeTab.filename;

      const path = await save({
        defaultPath: defaultName,
        filters: [{ name: "Markdown File", extensions: ["md"] }],
      });

      if (path) {
        const content = activeTab.kind === "preview"
          ? previewMarkdown
          : processContent(activeTab.markdown);

        await exportSingleMarkdown(content, path);
        success(`${t("dialog.exportSuccess", language)}`);
      }
    } catch (err) {
      toastError(`${t("dialog.exportFail", language)}: ${err}`);
    }
  }, [
    activeContentTabId,
    contentTabs,
    previewMarkdown,
    previewFilename,
    processContent,
    validation,
    language,
    success,
    toastError,
    info
  ]);

  const handleExportZip = useCallback(async () => {
    const activeTab = contentTabs.find((tab) => tab.id === activeContentTabId);
    if (!activeTab || (activeTab.kind !== "preview" && activeTab.kind !== "ai")) {
      info(t("dialog.noReport", language));
      return;
    }

    if (activeTab.kind === "preview" && validation && !validation.valid) {
      info(t("dialog.validationFail", language));
      return;
    }

    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      
      const defaultFilename = activeTab.kind === "preview"
        ? (previewFilename || "preview.md")
        : activeTab.filename;

      const defaultZipName = defaultFilename.replace(/\.md$/, ".zip");

      const path = await save({
        defaultPath: defaultZipName,
        filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
      });

      if (path) {
        const content = activeTab.kind === "preview"
          ? previewMarkdown
          : processContent(activeTab.markdown);

        await exportSingleZip(defaultFilename, content, path);
        success(`${t("dialog.exportSuccess", language)}`);
      }
    } catch (err) {
      toastError(`${t("dialog.exportFail", language)}: ${err}`);
    }
  }, [
    activeContentTabId,
    contentTabs,
    previewMarkdown,
    previewFilename,
    processContent,
    validation,
    language,
    success,
    toastError,
    info
  ]);

  return { handleExportMd, handleExportZip };
}
