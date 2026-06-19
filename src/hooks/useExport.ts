import { useCallback } from "react";
import { exportSingleMarkdown, exportSingleZip } from "../lib/api";
import { useToast } from "./useToast";
import { t } from "../lib/i18n";
import { useProjectStore } from "../state/projectStore";

const SIGNATURE = "\n\n<!-- review-weaver-signature: v1 -->";

type ExportMode = "md" | "zip";

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

  const exportTab = useCallback(async (mode: ExportMode) => {
    const activeTab = contentTabs.find((tab) => tab.id === activeContentTabId);
    if (!activeTab || (activeTab.kind !== "preview" && activeTab.kind !== "ai")) {
      info(t("dialog.noReport", language));
      return;
    }
    if (activeTab.kind === "preview" && validation && !validation.valid) {
      info(t("dialog.validationFail", language));
      return;
    }

    const defaultName =
      activeTab.kind === "preview"
        ? previewFilename || "preview.md"
        : activeTab.filename;
    const isMd = mode === "md";
    const defaultPath = isMd
      ? defaultName
      : defaultName.replace(/\.md$/, ".zip");
    const filter = isMd
      ? { name: "Markdown File", extensions: ["md"] }
      : { name: "ZIP Archive", extensions: ["zip"] };

    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const path = await save({ defaultPath, filters: [filter] });
      if (!path) return;

      const raw = activeTab.kind === "preview" ? previewMarkdown : processContent(activeTab.markdown);
      const content = raw + SIGNATURE;
      if (isMd) {
        await exportSingleMarkdown(content, path);
      } else {
        await exportSingleZip(defaultName, content, path);
      }
      success(t("dialog.exportSuccess", language));
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
    info,
  ]);

  return {
    handleExportMd: useCallback(() => exportTab("md"), [exportTab]),
    handleExportZip: useCallback(() => exportTab("zip"), [exportTab]),
  };
}
