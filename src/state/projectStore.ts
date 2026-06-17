import { create } from "zustand";
import type { Project, QaReport, Component, ValidationReport, DebugLog } from "../lib/api";
import { validateProject } from "../lib/api";
import { t, type Language } from "../lib/i18n";

function generateId(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 11);
}

let validationGeneration = 0;

const DEFAULT_PREVIEW_TAB = { id: "preview" as const, kind: "preview" as const, title: "Preview" };

export type MainTab = "home" | "reports" | "opening" | "closing" | "debug";

export type ContentTab =
  | { id: "preview"; kind: "preview"; title: string }
  | { id: string; kind: "ai"; title: string; markdown: string }
  | { id: string; kind: "debug"; title: string; log: DebugLog };

export type ActiveItem =
  | { type: "report"; qaId: string }
  | { type: "component"; componentId: string };

interface ProjectState {
  project: Project;
  selectedQaId: string | null;
  activeMainTab: MainTab;
  activeItem: ActiveItem | null;
  validation: ValidationReport | null;
  darkMode: boolean;
  language: Language;
  compactMode: boolean;
  removeWhitespace: boolean;
  mergeLines: boolean;
  translateVietnamese: boolean;
  removeChinese: boolean;
  debugEnabled: boolean;

  // Content tabs
  contentTabs: ContentTab[];
  activeContentTabId: string;
  setActiveContentTab: (id: string) => void;
  appendAiTab: (markdown: string, title: string) => string;
  appendDebugTab: (log: DebugLog) => string;
  closeContentTab: (id: string) => void;
  closeAllAiTabs: () => void;

  // Preview format
  previewFormat: "html" | "markdown";
  setPreviewFormat: (f: "html" | "markdown") => void;

  // AI busy flag
  aiBusy: boolean;
  setAiBusy: (b: boolean) => void;

  // Project actions
  setProject: (project: Project) => void;
  newProject: () => void;
  setProjectTitle: (title: string) => void;

  // QA actions
  addQa: () => void;
  removeQa: (id: string) => void;
  duplicateQa: (id: string) => void;
  updateQaName: (id: string, name: string) => void;
  updateQaContent: (id: string, content: string) => void;
  removeEmptyQa: () => void;
  removeAllQa: () => void;

  // Component actions
  addComponent: (position: "opening" | "closing") => void;
  removeComponent: (id: string) => void;
  updateComponentName: (id: string, name: string) => void;
  updateComponentContent: (id: string, content: string) => void;
  moveComponentUp: (id: string) => void;
  moveComponentDown: (id: string) => void;
  toggleQaActive: (id: string) => void;
  toggleComponentActive: (id: string) => void;
  toggleExcludeSelf: () => void;
  duplicateComponent: (id: string) => void;

  // Selection
  selectQa: (id: string | null) => void;
  selectQaOnly: (id: string | null) => void;
  selectComponent: (id: string) => void;
  setActiveMainTab: (tab: MainTab) => void;

  // Validation
  refreshValidation: () => Promise<void>;

  // Settings
  setLanguage: (lang: Language) => void;
  toggleCompactMode: () => void;
  toggleRemoveWhitespace: () => void;
  toggleMergeLines: () => void;
  toggleTranslateVietnamese: () => void;
  toggleRemoveChinese: () => void;
  setDebugEnabled: (b: boolean) => void;

  // Theme
  toggleDarkMode: () => void;

  // Content processing
  processContent: (content: string) => string;

  // Preview markdown (for copy in footer)
  previewMarkdown: string;
  setPreviewMarkdown: (md: string) => void;
}

const DEFAULT_PROJECT: Project = {
  title: "",
  components: [],
  qa_reports: [],
  exclude_self: true,
};

// Migrate old project format to new format
function migrateProject(project: Project): Project {
  const migrated = { ...project, components: [...(project.components || [])] };
  // Migrate old opening_text/closing_text to components
  if ('opening_text' in (project as any) && (project as any).opening_text) {
    const hasOpening = migrated.components.some(c => c.position === "opening");
    if (!hasOpening) {
      const maxOrder = migrated.components
        .filter(c => c.position === "opening")
        .reduce((max, c) => Math.max(max, c.order), -1);
      migrated.components.push({
        id: generateId(),
        name: "Opening",
        position: "opening",
        content: (project as any).opening_text,
        order: maxOrder + 1,
      });
    }
  }
  if ('closing_text' in (project as any) && (project as any).closing_text) {
    const hasClosing = migrated.components.some(c => c.position === "closing");
    if (!hasClosing) {
      const maxOrder = migrated.components
        .filter(c => c.position === "closing")
        .reduce((max, c) => Math.max(max, c.order), -1);
      migrated.components.push({
        id: generateId(),
        name: "Closing",
        position: "closing",
        content: (project as any).closing_text,
        order: maxOrder + 1,
      });
    }
  }
  // Clear legacy fields to prevent redundant serialization in saved files
  delete (migrated as any).opening_text;
  delete (migrated as any).closing_text;
  return migrated;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: { ...DEFAULT_PROJECT },
  selectedQaId: null,
  activeMainTab: "home",
  activeItem: null,
  validation: null,
  darkMode: window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
  language: "en",
  compactMode: false,
  removeWhitespace: false,
  mergeLines: false,
  translateVietnamese: false,
  removeChinese: false,
  debugEnabled: false,
  contentTabs: [DEFAULT_PREVIEW_TAB],
  activeContentTabId: "preview",
  previewFormat: "html",
  aiBusy: false,
  previewMarkdown: "",

  setProject: (project) => {
    const migrated = migrateProject(project);
    const firstQa = migrated.qa_reports[0];
    set({
      project: migrated,
      selectedQaId: firstQa?.id ?? null,
      activeMainTab: "home",
      activeItem: firstQa ? { type: "report", qaId: firstQa.id } : null,
      contentTabs: [DEFAULT_PREVIEW_TAB],
      activeContentTabId: "preview",
      previewMarkdown: "",
      aiBusy: false,
      validation: null,
    });
    get().refreshValidation();
  },

  newProject: () => {
    set({
      project: { ...DEFAULT_PROJECT, components: [...DEFAULT_PROJECT.components], qa_reports: [], exclude_self: true },
      selectedQaId: null,
      activeMainTab: "home",
      activeItem: null,
      contentTabs: [DEFAULT_PREVIEW_TAB],
      activeContentTabId: "preview",
      previewMarkdown: "",
      aiBusy: false,
      validation: null,
    });
    get().refreshValidation();
  },

  setProjectTitle: (title) => {
    set((state) => ({ project: { ...state.project, title } }));
  },

  addQa: () => {
    const id = generateId();
    const newQa: QaReport = { id, name: "", content: "", active: true };
    set((state) => ({
      project: {
        ...state.project,
        qa_reports: [...state.project.qa_reports, newQa],
      },
      selectedQaId: id,
      activeMainTab: "reports" as MainTab,
      activeItem: { type: "report" as const, qaId: id },
    }));
    get().refreshValidation();
  },

  removeQa: (id) => {
    set((state) => {
      const newReports = state.project.qa_reports.filter((q) => q.id !== id);
      const newSelected =
        state.selectedQaId === id
          ? newReports[0]?.id ?? null
          : state.selectedQaId;
      // Preserve component selection when deleting a non-selected QA
      const newActiveItem =
        state.activeItem?.type === "component"
          ? state.activeItem
          : newSelected
            ? { type: "report" as const, qaId: newSelected }
            : null;
      return {
        project: { ...state.project, qa_reports: newReports },
        selectedQaId: newSelected,
        activeItem: newActiveItem,
      };
    });
    get().refreshValidation();
  },

  duplicateQa: (id) => {
    const qa = get().project.qa_reports.find((q) => q.id === id);
    if (!qa) return;
    const newId = generateId();
    const copySuffix = t("suffix.copy", get().language);
    const newQa: QaReport = {
      id: newId,
      name: qa.name ? `${qa.name} ${copySuffix}` : copySuffix,
      content: qa.content,
      active: qa.active,
    };
    set((state) => {
      const idx = state.project.qa_reports.findIndex((q) => q.id === id);
      const reports = [...state.project.qa_reports];
      reports.splice(idx + 1, 0, newQa);
      return {
        project: { ...state.project, qa_reports: reports },
        selectedQaId: newId,
        activeItem: { type: "report" as const, qaId: newId },
      };
    });
    get().refreshValidation();
  },

  updateQaName: (id, name) => {
    set((state) => ({
      project: {
        ...state.project,
        qa_reports: state.project.qa_reports.map((q) =>
          q.id === id ? { ...q, name } : q
        ),
      },
    }));
    get().refreshValidation();
  },

  updateQaContent: (id, content) => {
    set((state) => ({
      project: {
        ...state.project,
        qa_reports: state.project.qa_reports.map((q) =>
          q.id === id ? { ...q, content } : q
        ),
      },
    }));
    get().refreshValidation();
  },

  removeEmptyQa: () => {
    set((state) => {
      const reports = state.project.qa_reports.filter(
        (q) => q.name.trim() !== "" || q.content.trim() !== ""
      );
      const newSelected =
        reports.find((q) => q.id === state.selectedQaId)?.id ??
        reports[0]?.id ??
        null;
      // Preserve component selection when removing empty QAs
      const newActiveItem =
        state.activeItem?.type === "component"
          ? state.activeItem
          : newSelected
            ? { type: "report" as const, qaId: newSelected }
            : state.activeItem;
      return {
        project: { ...state.project, qa_reports: reports },
        selectedQaId: newSelected,
        activeItem: newActiveItem,
      };
    });
    get().refreshValidation();
  },

  removeAllQa: () => {
    set((state) => ({
      project: { ...state.project, qa_reports: [] },
      selectedQaId: null,
      // Preserve component selection — components are not deleted
      activeItem:
        state.activeItem?.type === "component" ? state.activeItem : null,
    }));
    get().refreshValidation();
  },

  // Component actions
  addComponent: (position) => {
    const id = generateId();
    const existing = get().project.components.filter(c => c.position === position);
    const maxOrder = existing.reduce((max, c) => Math.max(max, c.order), -1);
    const newComponent: Component = {
      id,
      name: "",
      position,
      content: "",
      order: maxOrder + 1,
      active: true,
    };
    set((state) => ({
      project: {
        ...state.project,
        components: [...state.project.components, newComponent],
      },
      activeMainTab: position,
      activeItem: { type: "component" as const, componentId: id },
    }));
    get().refreshValidation();
  },

  removeComponent: (id) => {
    set((state) => {
      const comp = state.project.components.find(c => c.id === id);
      const newComponents = state.project.components.filter(c => c.id !== id);
      const currentActive = state.activeItem;
      let newActive = currentActive;
      if (currentActive?.type === "component" && currentActive.componentId === id) {
        const samePos = newComponents.filter(c => c.position === comp?.position);
        newActive = samePos[0] ? { type: "component" as const, componentId: samePos[0].id } : null;
      }
      return {
        project: { ...state.project, components: newComponents },
        activeItem: newActive,
      };
    });
    get().refreshValidation();
  },

  updateComponentName: (id, name) => {
    set((state) => ({
      project: {
        ...state.project,
        components: state.project.components.map(c =>
          c.id === id ? { ...c, name } : c
        ),
      },
    }));
    get().refreshValidation();
  },

  updateComponentContent: (id, content) => {
    set((state) => ({
      project: {
        ...state.project,
        components: state.project.components.map(c =>
          c.id === id ? { ...c, content } : c
        ),
      },
    }));
    get().refreshValidation();
  },

  moveComponentUp: (id) => {
    set((state) => {
      const comp = state.project.components.find(c => c.id === id);
      if (!comp) return state;
      const samePos = state.project.components
        .filter(c => c.position === comp.position)
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
      const idx = samePos.findIndex(c => c.id === id);
      if (idx <= 0) return state;
      const prev = samePos[idx - 1];
      const newComponents = state.project.components.map(c => {
        if (c.id === id) return { ...c, order: prev.order };
        if (c.id === prev.id) return { ...c, order: comp.order };
        return c;
      });
      return { project: { ...state.project, components: newComponents } };
    });
    get().refreshValidation();
  },

  moveComponentDown: (id) => {
    set((state) => {
      const comp = state.project.components.find(c => c.id === id);
      if (!comp) return state;
      const samePos = state.project.components
        .filter(c => c.position === comp.position)
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
      const idx = samePos.findIndex(c => c.id === id);
      if (idx >= samePos.length - 1) return state;
      const next = samePos[idx + 1];
      const newComponents = state.project.components.map(c => {
        if (c.id === id) return { ...c, order: next.order };
        if (c.id === next.id) return { ...c, order: comp.order };
        return c;
      });
      return { project: { ...state.project, components: newComponents } };
    });
    get().refreshValidation();
  },

  selectQa: (id) => set({
    selectedQaId: id,
    activeMainTab: "reports",
    activeItem: id ? { type: "report", qaId: id } : null,
  }),
  /** Like selectQa but does NOT change activeMainTab — for PreviewBody auto-select. */
  selectQaOnly: (id) => set({
    selectedQaId: id,
    activeItem: id ? { type: "report", qaId: id } : null,
  }),

  selectComponent: (id) => {
    const comp = get().project.components.find(c => c.id === id);
    set({
      activeMainTab: comp?.position ?? "opening",
      activeItem: { type: "component", componentId: id },
    });
  },

  setActiveMainTab: (tab) => set({ activeMainTab: tab }),

  toggleQaActive: (id) => {
    set((state) => ({
      project: {
        ...state.project,
        qa_reports: state.project.qa_reports.map((q) =>
          q.id === id ? { ...q, active: !(q.active === false) } : q
        ),
      },
    }));
    get().refreshValidation();
  },

  toggleComponentActive: (id) => {
    set((state) => ({
      project: {
        ...state.project,
        components: state.project.components.map((c) =>
          c.id === id ? { ...c, active: !(c.active === false) } : c
        ),
      },
    }));
    get().refreshValidation();
  },

  toggleExcludeSelf: () => {
    set((state) => ({
      project: {
        ...state.project,
        exclude_self: state.project.exclude_self === false,
      },
    }));
    get().refreshValidation();
  },

  duplicateComponent: (id) => {
    const comp = get().project.components.find((c) => c.id === id);
    if (!comp) return;
    const newId = generateId();
    const existing = get().project.components.filter(c => c.position === comp.position);
    const maxOrder = existing.reduce((max, c) => Math.max(max, c.order), -1);
    const copySuffix = t("suffix.copy", get().language);
    const newComponent: Component = {
      id: newId,
      name: comp.name ? `${comp.name} ${copySuffix}` : copySuffix,
      position: comp.position,
      content: comp.content,
      order: maxOrder + 1,
      active: comp.active,
    };
    set((state) => ({
      project: {
        ...state.project,
        components: [...state.project.components, newComponent],
      },
      activeItem: { type: "component" as const, componentId: newId },
    }));
    get().refreshValidation();
  },

  refreshValidation: async () => {
    const gen = ++validationGeneration;
    try {
      const report = await validateProject(get().project);
      if (gen !== validationGeneration) return;
      set({ validation: report });
    } catch (err) {
      if (gen !== validationGeneration) return;
      console.error("IPC validation failed, using local fallback:", err);
      const p = get().project;
      const errors: string[] = [];
      const warnings: string[] = [];
      const activeReports = p.qa_reports.filter((q) => q.active !== false);
      if (activeReports.length < 2) {
        errors.push("Need at least 2 active sources for cross-review. / Cần ít nhất 2 nguồn hoạt động để review chéo.");
      }
      let activeIndex = 0;
      p.qa_reports.forEach((q) => {
        if (q.active === false) return;
        activeIndex++;
        const label = `Source #${activeIndex}`;
        if (q.name.trim() === "") errors.push(`${label}: missing name. / thiếu tên.`);
        if (q.content.trim() === "") errors.push(`${label}: missing content. / thiếu nội dung.`);
      });
      set({
        validation: { valid: errors.length === 0, errors, warnings },
      });
    }
  },

  setLanguage: (lang) => set({ language: lang }),
  toggleCompactMode: () => set((state) => ({ compactMode: !state.compactMode })),
  toggleRemoveWhitespace: () => set((state) => ({ removeWhitespace: !state.removeWhitespace })),
  toggleMergeLines: () => set((state) => ({ mergeLines: !state.mergeLines })),
  toggleTranslateVietnamese: () => set((state) => ({ translateVietnamese: !state.translateVietnamese })),
  toggleRemoveChinese: () => set((state) => ({ removeChinese: !state.removeChinese })),
  setDebugEnabled: (b) => set({ debugEnabled: b }),

  setActiveContentTab: (id) => set({ activeContentTabId: id }),

  appendAiTab: (markdown, title) => {
    const id = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({
      contentTabs: [...state.contentTabs, { id, kind: "ai" as const, title, markdown }],
      activeContentTabId: id,
    }));
    return id;
  },

  appendDebugTab: (log) => {
    const id = `debug-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const title = `Debug ${log.provider}/${log.model}`;
    set((state) => ({
      contentTabs: [...state.contentTabs, { id, kind: "debug" as const, title, log }],
      activeContentTabId: id,
    }));
    return id;
  },

  closeContentTab: (id) => {
    if (id === "preview") return;
    set((state) => {
      const tabs = state.contentTabs.filter((t) => t.id !== id);
      const activeId = state.activeContentTabId === id ? "preview" : state.activeContentTabId;
      return { contentTabs: tabs, activeContentTabId: activeId };
    });
  },

  closeAllAiTabs: () => {
    set({ contentTabs: [DEFAULT_PREVIEW_TAB], activeContentTabId: "preview" });
  },

  setPreviewFormat: (f) => set({ previewFormat: f }),
  setAiBusy: (b) => set({ aiBusy: b }),

  toggleDarkMode: () => {
    set((state) => {
      const newMode = !state.darkMode;
      document.documentElement.classList.toggle("dark", newMode);
      return { darkMode: newMode };
    });
  },

  setPreviewMarkdown: (md) => set({ previewMarkdown: md }),

  processContent: (content: string) => {
    const state = get();
    let processed = content;
    if (state.removeWhitespace) {
      processed = processed.replace(/\n{3,}/g, "\n\n");
    }
    // Skip compactMode when mergeLines is active — mergeLines needs paragraph
    // breaks (\n\n) intact to produce the ' | ' separator.
    if (state.compactMode && !state.mergeLines) {
      processed = processed.replace(/\n{2,}/g, "\n");
    }
    if (state.mergeLines) {
      let lines = processed.split("\n");
      let inCodeBlock = false;
      lines = lines.map((line) => {
        const trimmed = line.trim();
        // Track fenced code blocks — don't transform content inside them
        if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
          inCodeBlock = !inCodeBlock;
          return line;
        }
        if (inCodeBlock) return line;
        // Remove markdown horizontal rules
        if (trimmed === "---" || trimmed === "___" || trimmed === "***") {
          return "";
        }
        if (/^#{1,6}\s/.test(trimmed)) {
          return trimmed.replace(/^#+\s*/, "");
        }
        return line;
      });

      // Preserve paragraph breaks (empty lines) as " | " before merging
      // First pass: collapse consecutive empty lines into a single marker
      let joined = "";
      let prevEmpty = false;
      for (const line of lines) {
        const isEmpty = line.trim() === "";
        if (isEmpty) {
          if (!prevEmpty) {
            joined += "\n\n"; // paragraph break marker
          }
          prevEmpty = true;
        } else {
          if (joined && !prevEmpty) {
            joined += "\n";
          }
          joined += line;
          prevEmpty = false;
        }
      }

      // Merge all lines into one continuous line
      processed = joined
        .replace(/\n{2,}/g, " | ")  // paragraph break → separator
        .replace(/\n/g, " ")         // line break → space
        .replace(/\s{2,}/g, " ")     // multiple spaces → single space
        .trim();
    }
    return processed;
  },
}));
