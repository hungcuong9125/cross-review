import { create } from "zustand";
import type { Project, QaReport, ValidationReport } from "../lib/api";
import { validateProject } from "../lib/api";

// Generate a simple UUID-like ID
function generateId(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 11);
}

export type ActiveTab = "opening" | "reports" | "closing";

interface ProjectState {
  // Data
  project: Project;
  selectedQaId: string | null;
  activeTab: ActiveTab;
  validation: ValidationReport | null;
  darkMode: boolean;

  // Project actions
  setProject: (project: Project) => void;
  newProject: () => void;
  setProjectTitle: (title: string) => void;

  // Opening/Closing
  setOpeningText: (text: string) => void;
  setClosingText: (text: string) => void;

  // QA actions
  addQa: () => void;
  removeQa: (id: string) => void;
  duplicateQa: (id: string) => void;
  updateQaName: (id: string, name: string) => void;
  updateQaContent: (id: string, content: string) => void;
  reorderQa: (fromIndex: number, toIndex: number) => void;
  removeEmptyQa: () => void;

  // Selection
  selectQa: (id: string | null) => void;
  setActiveTab: (tab: ActiveTab) => void;

  // Validation
  refreshValidation: () => Promise<void>;

  // Theme
  toggleDarkMode: () => void;
}

const DEFAULT_PROJECT: Project = {
  title: "",
  opening_text:
    "Hãy xem một số báo cáo từ QA sau và REVIEW thêm, đề xuất phương án cuối:\n",
  closing_text:
    "---\n\nTôi thì đang nghiêng về việc xây dựng một Node dạng Brief Collector để lưu dữ liệu cho toàn bộ cuộc nói chuyện. Ví dụ user có thể tải lên tệp PDF mới, tài liệu docs mới, hình ảnh hoặc các tệp đính kèm khác. Các dữ liệu này cần được lưu xuyên suốt trong cuộc trò chuyện, sau đó hệ thống mới cân nhắc có cần bổ sung thông tin còn thiếu hay không, rồi mới chuyển sang sửa prompt đầy đủ và gửi Main LLM trả lời.\n\nCác tệp tài liệu sẽ là context xuyên suốt của cuộc trò chuyện.\n",
  qa_reports: [],
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: { ...DEFAULT_PROJECT },
  selectedQaId: null,
  activeTab: "opening",
  validation: null,
  darkMode: window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,

  setProject: (project) => {
    set({ project, selectedQaId: project.qa_reports[0]?.id ?? null });
    get().refreshValidation();
  },

  newProject: () => {
    set({
      project: { ...DEFAULT_PROJECT, qa_reports: [] },
      selectedQaId: null,
      activeTab: "opening",
    });
    get().refreshValidation();
  },

  setProjectTitle: (title) => {
    set((state) => ({ project: { ...state.project, title } }));
  },

  setOpeningText: (text) => {
    set((state) => ({
      project: { ...state.project, opening_text: text },
    }));
  },

  setClosingText: (text) => {
    set((state) => ({
      project: { ...state.project, closing_text: text },
    }));
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
      activeTab: "reports",
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
      return {
        project: { ...state.project, qa_reports: newReports },
        selectedQaId: newSelected,
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
  },

  reorderQa: (fromIndex, toIndex) => {
    set((state) => {
      const reports = [...state.project.qa_reports];
      const [moved] = reports.splice(fromIndex, 1);
      reports.splice(toIndex, 0, moved);
      return { project: { ...state.project, qa_reports: reports } };
    });
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
      };
    });
    get().refreshValidation();
  },

  selectQa: (id) => set({ selectedQaId: id, activeTab: "reports" }),
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
        errors.push("Cần ít nhất 2 QA để review chéo.");
      }
      p.qa_reports.forEach((q) => {
        if (q.name.trim() === "") errors.push(`${q.id}: thiếu tên.`);
        if (q.content.trim() === "") errors.push(`${q.id}: thiếu nội dung.`);
      });
      set({
        validation: { valid: errors.length === 0, errors, warnings },
      });
    }
  },

  toggleDarkMode: () => {
    set((state) => {
      const newMode = !state.darkMode;
      document.documentElement.classList.toggle("dark", newMode);
      return { darkMode: newMode };
    });
  },
}));
