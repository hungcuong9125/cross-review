import { create } from "zustand";
import type { Project, QaReport, Component, ValidationReport } from "../lib/api";
import { validateProject } from "../lib/api";
import type { Language } from "../lib/i18n";

// Generate a simple UUID-like ID
function generateId(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 11);
}

export type ActiveTab = { type: "report"; qaId: string } | { type: "component"; componentId: string };

interface ProjectState {
  // Data
  project: Project;
  selectedQaId: string | null;
  activeTab: ActiveTab;
  validation: ValidationReport | null;
  darkMode: boolean;
  language: Language;
  compactMode: boolean;
  removeWhitespace: boolean;

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
  reorderComponents: (position: "opening" | "closing", fromIndex: number, toIndex: number) => void;

  // Selection
  selectQa: (id: string | null) => void;
  selectComponent: (id: string) => void;
  setActiveTab: (tab: ActiveTab) => void;

  // Validation
  refreshValidation: () => Promise<void>;

  // Settings
  setLanguage: (lang: Language) => void;
  toggleCompactMode: () => void;
  toggleRemoveWhitespace: () => void;

  // Theme
  toggleDarkMode: () => void;

  // Content processing
  processContent: (content: string) => string;
}

const DEFAULT_PROJECT: Project = {
  title: "",
  components: [
    {
      id: "default-opening",
      name: "Mở đầu",
      position: "opening",
      content: "Hãy xem một số báo cáo từ QA sau và REVIEW thêm, đề xuất phương án cuối:\n",
      order: 0,
    },
    {
      id: "default-closing",
      name: "Kết thúc",
      position: "closing",
      content: "Hãy tổng hợp và đề xuất phương án cuối cùng dựa trên các báo cáo trên.\n",
      order: 0,
    },
  ],
  qa_reports: [],
};

// Migrate old project format to new format
function migrateProject(project: Project): Project {
  const migrated = { ...project };
  if (!migrated.components) {
    migrated.components = [];
  }
  // Migrate old opening_text/closing_text to components
  if ('opening_text' in (project as any) && (project as any).opening_text) {
    const hasOpening = migrated.components.some(c => c.position === "opening");
    if (!hasOpening) {
      migrated.components.push({
        id: generateId(),
        name: "Mở đầu",
        position: "opening",
        content: (project as any).opening_text,
        order: 0,
      });
    }
  }
  if ('closing_text' in (project as any) && (project as any).closing_text) {
    const hasClosing = migrated.components.some(c => c.position === "closing");
    if (!hasClosing) {
      migrated.components.push({
        id: generateId(),
        name: "Kết thúc",
        position: "closing",
        content: (project as any).closing_text,
        order: 0,
      });
    }
  }
  return migrated;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: { ...DEFAULT_PROJECT },
  selectedQaId: null,
  activeTab: { type: "component", componentId: "default-opening" },
  validation: null,
  darkMode: window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
  language: "vi",
  compactMode: false,
  removeWhitespace: false,

  setProject: (project) => {
    const migrated = migrateProject(project);
    set({
      project: migrated,
      selectedQaId: migrated.qa_reports[0]?.id ?? null,
      activeTab: migrated.qa_reports[0]
        ? { type: "report", qaId: migrated.qa_reports[0].id }
        : { type: "component", componentId: migrated.components[0]?.id ?? "" },
    });
    get().refreshValidation();
  },

  newProject: () => {
    set({
      project: { ...DEFAULT_PROJECT, components: [...DEFAULT_PROJECT.components], qa_reports: [] },
      selectedQaId: null,
      activeTab: { type: "component", componentId: "default-opening" },
    });
    get().refreshValidation();
  },

  setProjectTitle: (title) => {
    set((state) => ({ project: { ...state.project, title } }));
  },

  addQa: () => {
    const id = generateId();
    const num = get().project.qa_reports.length + 1;
    const newQa: QaReport = { id, name: `QA ${num}`, content: "" };
    set((state) => ({
      project: {
        ...state.project,
        qa_reports: [...state.project.qa_reports, newQa],
      },
      selectedQaId: id,
      activeTab: { type: "report", qaId: id },
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
      const newActiveTab: ActiveTab = newSelected
        ? { type: "report", qaId: newSelected }
        : { type: "component", componentId: state.project.components[0]?.id ?? "" };
      return {
        project: { ...state.project, qa_reports: newReports },
        selectedQaId: newSelected,
        activeTab: newActiveTab,
      };
    });
    get().refreshValidation();
  },

  duplicateQa: (id) => {
    const qa = get().project.qa_reports.find((q) => q.id === id);
    if (!qa) return;
    const newId = generateId();
    const newQa: QaReport = {
      id: newId,
      name: `${qa.name} (bản sao)`,
      content: qa.content,
    };
    set((state) => {
      const idx = state.project.qa_reports.findIndex((q) => q.id === id);
      const reports = [...state.project.qa_reports];
      reports.splice(idx + 1, 0, newQa);
      return {
        project: { ...state.project, qa_reports: reports },
        selectedQaId: newId,
        activeTab: { type: "report", qaId: newId },
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
      return {
        project: { ...state.project, qa_reports: reports },
        selectedQaId: newSelected,
        activeTab: newSelected
          ? { type: "report", qaId: newSelected }
          : state.activeTab,
      };
    });
    get().refreshValidation();
  },

  removeAllQa: () => {
    set((state) => ({
      project: { ...state.project, qa_reports: [] },
      selectedQaId: null,
      activeTab: { type: "component", componentId: state.project.components[0]?.id ?? "" },
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
      name: position === "opening" ? "Mở đầu" : "Kết thúc",
      position,
      content: "",
      order: maxOrder + 1,
    };
    set((state) => ({
      project: {
        ...state.project,
        components: [...state.project.components, newComponent],
      },
      activeTab: { type: "component", componentId: id },
    }));
  },

  removeComponent: (id) => {
    set((state) => {
      const newComponents = state.project.components.filter(c => c.id !== id);
      const currentTab = state.activeTab;
      let newTab = currentTab;
      if (currentTab.type === "component" && currentTab.componentId === id) {
        newTab = { type: "component", componentId: newComponents[0]?.id ?? "" };
      }
      return {
        project: { ...state.project, components: newComponents },
        activeTab: newTab,
      };
    });
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

  reorderComponents: (position, fromIndex, toIndex) => {
    set((state) => {
      const comps = state.project.components.filter(c => c.position === position);
      const others = state.project.components.filter(c => c.position !== position);
      const [moved] = comps.splice(fromIndex, 1);
      comps.splice(toIndex, 0, moved);
      // Update order values
      const reordered = comps.map((c, i) => ({ ...c, order: i }));
      return {
        project: { ...state.project, components: [...others, ...reordered] },
      };
    });
  },

  selectQa: (id) => set({
    selectedQaId: id,
    activeTab: id ? { type: "report", qaId: id } : { type: "component", componentId: get().project.components[0]?.id ?? "" },
  }),

  selectComponent: (id) => set({
    activeTab: { type: "component", componentId: id },
  }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  refreshValidation: async () => {
    try {
      const report = await validateProject(get().project);
      set({ validation: report });
    } catch {
      // If invoke fails (e.g., in dev without Tauri), do local validation
      const p = get().project;
      const errors: string[] = [];
      const warnings: string[] = [];
      if (p.qa_reports.length < 2) {
        errors.push("Need at least 2 QA for cross-review. / Cần ít nhất 2 QA để review chéo.");
      }
      p.qa_reports.forEach((q) => {
        if (q.name.trim() === "") errors.push(`${q.id}: missing name. / thiếu tên.`);
        if (q.content.trim() === "") errors.push(`${q.id}: missing content. / thiếu nội dung.`);
      });
      set({
        validation: { valid: errors.length === 0, errors, warnings },
      });
    }
  },

  setLanguage: (lang) => set({ language: lang }),
  toggleCompactMode: () => set((state) => ({ compactMode: !state.compactMode })),
  toggleRemoveWhitespace: () => set((state) => ({ removeWhitespace: !state.removeWhitespace })),

  toggleDarkMode: () => {
    set((state) => {
      const newMode = !state.darkMode;
      document.documentElement.classList.toggle("dark", newMode);
      return { darkMode: newMode };
    });
  },

  processContent: (content: string) => {
    const state = get();
    let processed = content;
    if (state.removeWhitespace) {
      // Remove consecutive blank lines (3+ newlines → 2 newlines)
      processed = processed.replace(/\n{3,}/g, "\n\n");
    }
    if (state.compactMode) {
      // Compact: remove all blank lines, merge into single block
      processed = processed.replace(/\n{2,}/g, "\n");
    }
    return processed;
  },
}));
