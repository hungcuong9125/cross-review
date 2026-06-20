use std::fs;
use std::path::Path;

use crate::ai;
use crate::export::generate_preview;
use crate::models::{
    AiErrorPayload, AiProviderConfig, AiRewriteResult, AppSettings, DebugLog, ExportFile, Project,
    ValidationReport,
};
use crate::validation::validate_project;
use tokio_util::sync::CancellationToken;

#[tauri::command]
pub fn validate_project_cmd(project: Project) -> Result<ValidationReport, String> {
    Ok(validate_project(&project))
}

#[tauri::command]
pub fn generate_preview_cmd(project: Project, target_qa_id: String) -> Result<ExportFile, String> {
    generate_preview(&project, &target_qa_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_single_markdown(markdown: String, output_path: String) -> Result<(), String> {
    let path = Path::new(&output_path);
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Cannot create directory: {}", e))?;
        }
    }
    fs::write(path, markdown).map_err(|e| format!("Cannot write file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn export_single_zip(
    filename: String,
    markdown: String,
    output_zip_path: String,
) -> Result<String, String> {
    crate::zip_export::export_single_to_zip(&filename, &markdown, &output_zip_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_project(project: Project, path: String) -> Result<(), String> {
    let json = serde_json::to_string_pretty(&project)
        .map_err(|e| format!("Serialization error: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Cannot write project file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn open_project(path: String) -> Result<Project, String> {
    let content =
        fs::read_to_string(&path).map_err(|e| format!("Cannot read project file: {}", e))?;
    let project: Project =
        serde_json::from_str(&content).map_err(|e| format!("Invalid project file: {}", e))?;

    let is_valid = match &project.document_type {
        Some(dt) => dt == "review-weaver-project",
        None => !project.qa_reports.is_empty() || !project.components.is_empty(),
    };

    if !is_valid {
        return Err("Tệp tin không đúng định dạng dự án của Review Weaver!".to_string());
    }

    Ok(project)
}

#[tauri::command]
pub async fn ai_test_provider(config: AiProviderConfig) -> Result<(), AiErrorPayload> {
    ai::test_provider(&config).await
}

#[tauri::command]
pub async fn ai_test_provider_debug(config: AiProviderConfig) -> Result<DebugLog, AiErrorPayload> {
    ai::test_provider_debug(&config).await
}

#[tauri::command]
pub async fn ai_list_models(config: AiProviderConfig) -> Result<Vec<String>, AiErrorPayload> {
    ai::list_models(&config).await
}

#[tauri::command]
pub async fn ai_rewrite_export(
    project: Project,
) -> Result<AiRewriteResult, AiErrorPayload> {
    let cancel = CancellationToken::new();
    let model = project
        .ai_config
        .as_ref()
        .map(|c| c.model.clone())
        .unwrap_or_default();
    let provider = project
        .ai_config
        .as_ref()
        .map(|c| c.kind.as_str().to_string())
        .unwrap_or_else(|| "ollama".to_string());
    let output = ai::rewrite_all(&project, cancel).await?;
    Ok(AiRewriteResult {
        markdown: output.markdown,
        model_used: model,
        provider,
        input_chars: output.input_chars,
        debug_log: output.debug_log,
    })
}

#[tauri::command]
pub async fn ai_cancel_request() -> Result<bool, String> {
    Ok(ai::cancel_in_flight())
}

#[tauri::command]
pub fn ai_default_prompt() -> String {
    ai::prompt_level_2().to_string()
}

#[tauri::command]
pub fn export_settings_cmd(settings: AppSettings, path: String) -> Result<(), String> {
    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Serialization error: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Cannot write settings file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn import_settings_cmd(path: String) -> Result<AppSettings, String> {
    let content =
        fs::read_to_string(&path).map_err(|e| format!("Cannot read settings file: {}", e))?;
    let settings: AppSettings =
        serde_json::from_str(&content).map_err(|e| format!("Invalid settings file: {}", e))?;

    let is_valid = match &settings.document_type {
        Some(dt) => dt == "review-weaver-settings",
        None => true,
    };

    if !is_valid {
        return Err("Tệp tin không đúng định dạng cấu hình của Review Weaver!".to_string());
    }

    Ok(settings)
}
