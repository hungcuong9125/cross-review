import { invoke } from "@tauri-apps/api/core";

export interface QaReport {
  id: string;
  name: string;
  content: string;
}

export interface Project {
  title: string;
  opening_text: string;
  closing_text: string;
  qa_reports: QaReport[];
}

export interface ExportFile {
  target_qa_id: string;
  filename: string;
  markdown: string;
}

export interface ValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateProject(project: Project): Promise<ValidationReport> {
  return invoke<ValidationReport>("validate_project_cmd", { project });
}

export async function generatePreview(
  project: Project,
  targetQaId: string
): Promise<ExportFile> {
  return invoke<ExportFile>("generate_preview_cmd", { project, targetQaId });
}

export async function exportAllMarkdown(
  project: Project,
  outputDir: string
): Promise<string[]> {
  return invoke<string[]>("export_all_markdown", { project, outputDir });
}

export async function exportAllZip(
  project: Project,
  outputZipPath: string
): Promise<string> {
  return invoke<string>("export_all_zip", { project, outputZipPath });
}

export async function saveProject(
  project: Project,
  path: string
): Promise<void> {
  return invoke<void>("save_project", { project, path });
}

export async function openProject(path: string): Promise<Project> {
  return invoke<Project>("open_project", { path });
}
