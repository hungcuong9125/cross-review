import { invoke } from "@tauri-apps/api/core";

export type AiProviderKind =
  | "ollama" | "openai" | "anthropic" | "gemini"
  | "deepseek" | "mimo" | "opencodego" | "openaicompatible";

export interface AiProviderConfig {
  kind: AiProviderKind;
  base_url: string;
  api_key: string;
  model: string;
  system_prompt: string;
  max_input_chars: number;
  thinking_effort: string;
  translate_vietnamese: boolean;
  remove_chinese: boolean;
  prompt_level: string;
}

export interface AiRewriteResult {
  markdown: string;
  model_used: string;
  provider: string;
  input_chars: number;
  debug_log?: DebugLog;
}

export type AiErrorCode =
  | "not_configured" | "no_sources" | "target_not_found"
  | "input_too_large" | "timeout" | "provider"
  | "empty_response" | "cancelled";

export interface AiErrorPayload {
  code: AiErrorCode;
  message: string;
}

export interface QaReport {
  id: string;
  name: string;
  content: string;
  active?: boolean;
}

export interface Component {
  id: string;
  name: string;
  position: "opening" | "closing";
  content: string;
  order: number;
  active?: boolean;
}

export interface Project {
  title: string;
  components: Component[];
  qa_reports: QaReport[];
  exclude_self?: boolean;
  ai_config?: AiProviderConfig;
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

export async function aiTestProvider(config: AiProviderConfig): Promise<void> {
  return invoke<void>("ai_test_provider", { config });
}

export interface DebugLog {
  timestamp: string;
  provider: string;
  model: string;
  thinking_effort: string;
  request_messages: string;
  response_text: string;
  duration_ms: number;
  success: boolean;
}

export async function aiTestProviderDebug(config: AiProviderConfig): Promise<DebugLog> {
  return invoke<DebugLog>("ai_test_provider_debug", { config });
}

export async function aiRewriteExport(project: Project): Promise<AiRewriteResult> {
  return invoke<AiRewriteResult>("ai_rewrite_export", { project });
}

export async function aiListModels(config: AiProviderConfig): Promise<string[]> {
  return invoke<string[]>("ai_list_models", { config });
}

export async function aiCancelRequest(): Promise<boolean> {
  return invoke<boolean>("ai_cancel_request");
}

export async function aiDefaultPrompt(): Promise<string> {
  return invoke<string>("ai_default_prompt");
}

export interface AppSettings {
  ai_config?: AiProviderConfig;
  compact_mode: boolean;
  remove_whitespace: boolean;
  merge_lines: boolean;
  preview_format: string;
  translate_vietnamese: boolean;
  remove_chinese: boolean;
  debug_enabled: boolean;
}

export async function exportSettings(settings: AppSettings, path: string): Promise<void> {
  return invoke<void>("export_settings_cmd", { settings, path });
}

export async function importSettings(path: string): Promise<AppSettings> {
  return invoke<AppSettings>("import_settings_cmd", { path });
}
