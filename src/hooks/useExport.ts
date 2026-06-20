import { useCallback } from "react";
import { exportSingleMarkdown, exportMultipleToZip, generatePreview, type ZipEntry } from "../lib/api";
import { useToast } from "./useToast";
import { t } from "../lib/i18n";
import { useProjectStore } from "../state/projectStore";
import { toSlug } from "../lib/slug";

const SIGNATURE = "\n\n<!-- cross-review-signature: v1 -->";

function uniqueFilename(filename: string, used: Set<string>): string {
  let candidate = filename;
  let counter = 1;
  while (used.has(candidate)) {
    const dotIdx = filename.lastIndexOf(".");
    const base = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
    const ext = dotIdx > 0 ? filename.slice(dotIdx) : ".md";
    candidate = `${base}-${counter}${ext}`;
    counter++;
  }
  used.add(candidate);
  return candidate;
}

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
    project,
    selectedQaId,
  } = useProjectStore();

  const handleExportSourceMd = useCallback(async () => {
    const source = project.qa_reports.find((q) => q.id === selectedQaId);
    if (!source) {
      info(t("dialog.noSource", language));
      return;
    }

    const slug = source.name ? toSlug(source.name) : "";
    const defaultName = `${slug || "source"}.md`;

    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const path = await save({
        defaultPath: defaultName,
        filters: [{ name: "Markdown File", extensions: ["md"] }],
      });
      if (!path) return;

      await exportSingleMarkdown(source.content + SIGNATURE, path);
      success(t("dialog.exportSuccess", language));
    } catch (err) {
      toastError(`${t("dialog.exportFail", language)}: ${err}`);
    }
  }, [project.qa_reports, selectedQaId, language, success, toastError, info]);

  const handleExportSourceZip = useCallback(async () => {
    const activeSources = project.qa_reports.filter((q) => q.active !== false);
    if (activeSources.length === 0) {
      info(t("dialog.noSource", language));
      return;
    }

    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const path = await save({
        defaultPath: "sources.zip",
        filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
      });
      if (!path) return;

      const usedNames = new Set<string>();
      const entries: ZipEntry[] = activeSources.map((q) => {
        const slug = q.name ? toSlug(q.name) : "";
        const filename = uniqueFilename(`${slug || "source"}.md`, usedNames);
        return { filename, markdown: q.content + SIGNATURE };
      });

      await exportMultipleToZip(entries, path);
      success(t("dialog.exportSuccess", language));
    } catch (err) {
      toastError(`${t("dialog.exportFail", language)}: ${err}`);
    }
  }, [project.qa_reports, language, success, toastError, info]);

  const handleExportTabMd = useCallback(async () => {
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

    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const path = await save({
        defaultPath: defaultName,
        filters: [{ name: "Markdown File", extensions: ["md"] }],
      });
      if (!path) return;

      const raw = activeTab.kind === "preview" ? previewMarkdown : processContent(activeTab.markdown);
      const content = raw + SIGNATURE;
      await exportSingleMarkdown(content, path);
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

  const handleExportAllTabsZip = useCallback(async () => {
    const exportableTabs = contentTabs.filter(
      (tab) => tab.kind === "preview" || tab.kind === "ai"
    );
    if (exportableTabs.length === 0) {
      info(t("dialog.noReport", language));
      return;
    }
    if (validation && !validation.valid) {
      info(t("dialog.validationFail", language));
      return;
    }

    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const path = await save({
        defaultPath: "all-reports.zip",
        filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
      });
      if (!path) return;

      const usedNames = new Set<string>();
      const entries: ZipEntry[] = [];
      for (const tab of exportableTabs) {
        let filename: string;
        let markdown: string;
        if (tab.kind === "preview") {
          try {
            const fresh = selectedQaId
              ? await generatePreview(project, selectedQaId)
              : null;
            if (fresh) {
              filename = fresh.filename || "preview.md";
              markdown = processContent(fresh.markdown) + SIGNATURE;
            } else {
              filename = previewFilename || "preview.md";
              markdown = previewMarkdown + SIGNATURE;
            }
          } catch {
            filename = previewFilename || "preview.md";
            markdown = previewMarkdown + SIGNATURE;
          }
        } else {
          filename = tab.filename;
          markdown = processContent(tab.markdown) + SIGNATURE;
        }
        entries.push({ filename: uniqueFilename(filename, usedNames), markdown });
      }

      await exportMultipleToZip(entries, path);
      success(t("dialog.exportSuccess", language));
    } catch (err) {
      toastError(`${t("dialog.exportFail", language)}: ${err}`);
    }
  }, [
    contentTabs,
    previewMarkdown,
    previewFilename,
    processContent,
    validation,
    language,
    project,
    selectedQaId,
    success,
    toastError,
    info,
  ]);

  const handleExportDebugLog = useCallback(async () => {
    const activeTab = contentTabs.find((tab) => tab.id === activeContentTabId);
    if (!activeTab || activeTab.kind !== "debug") {
      info(t("dialog.noReport", language));
      return;
    }
    const log = activeTab.log;
    const providerSlug = toSlug(log.provider) || "provider";
    const modelSlug = toSlug(log.model) || "model";
    const defaultName = `debug-${providerSlug}-${modelSlug}.md`;

    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const path = await save({
        defaultPath: defaultName,
        filters: [{ name: "Markdown File", extensions: ["md"] }],
      });
      if (!path) return;

      const content = [
        `Provider: ${log.provider}`,
        `Model: ${log.model}`,
        `Thinking: ${log.thinking_effort || "none"}`,
        `Duration: ${log.duration_ms}ms`,
        `Status: ${log.success ? "OK" : "FAILED"}`,
        "",
        "--- Request ---",
        log.request_messages,
        "",
        `--- ${log.success ? "Response" : "Error"} ---`,
        log.response_text,
      ].join("\n") + SIGNATURE;
      await exportSingleMarkdown(content, path);
      success(t("dialog.exportSuccess", language));
    } catch (err) {
      toastError(`${t("dialog.exportFail", language)}: ${err}`);
    }
  }, [activeContentTabId, contentTabs, language, success, toastError, info]);

  return {
    handleExportSourceMd,
    handleExportSourceZip,
    handleExportTabMd,
    handleExportAllTabsZip,
    handleExportDebugLog,
  };
}
