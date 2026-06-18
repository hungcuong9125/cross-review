import { useCallback } from "react";
import { exportAllMarkdown, exportAllZip } from "../lib/api";
import { useToast } from "./useToast";
import { t } from "../lib/i18n";
import type { Language } from "../lib/i18n";
import type { Project, ValidationReport } from "../lib/api";

export function useExportActions(
  project: Project,
  validation: ValidationReport | null,
  language: Language,
) {
  const { success, error: toastError, info } = useToast();

  const handleExportMd = useCallback(async () => {
    if (project.qa_reports.length === 0) {
      info(t("dialog.noReport", language));
      return;
    }
    if (validation && !validation.valid) {
      info(t("dialog.validationFail", language));
      return;
    }
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const dir = await open({ directory: true, multiple: false });
      if (dir) {
        const paths = await exportAllMarkdown(project, dir as string);
        success(`${t("dialog.exportSuccess", language)}: ${paths.length} files`);
      }
    } catch (err) {
      toastError(`${t("dialog.exportFail", language)}: ${err}`);
    }
  }, [project, validation, language, success, toastError, info]);

  const handleExportZip = useCallback(async () => {
    if (project.qa_reports.length === 0) {
      info(t("dialog.noReport", language));
      return;
    }
    if (validation && !validation.valid) {
      info(t("dialog.validationFail", language));
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
        success(`${t("dialog.exportSuccess", language)}: ${result}`);
      }
    } catch (err) {
      toastError(`${t("dialog.exportFail", language)}: ${err}`);
    }
  }, [project, validation, language, success, toastError, info]);

  return { handleExportMd, handleExportZip };
}
