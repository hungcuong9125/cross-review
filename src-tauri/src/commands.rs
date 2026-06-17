use std::fs;
use std::path::Path;

use crate::ai;
use crate::export::{generate_exports, generate_preview};
use crate::models::{
    AiErrorPayload, AiProviderConfig, AiRewriteResult, ExportFile, Project, ValidationReport,
};
use crate::validation::validate_project;
use crate::zip_export::export_to_zip;
use tokio_util::sync::CancellationToken;

#[tauri::command]
pub fn validate_project_cmd(project: Project) -> Result<ValidationReport, String> {
    Ok(validate_project(&project))
}

/// Generates a preview export for a specific QA target.
#[tauri::command]
pub fn generate_preview_cmd(project: Project, target_qa_id: String) -> Result<ExportFile, String> {
    generate_preview(&project, &target_qa_id).map_err(|e| e.to_string())
}

/// Exports all markdown files to a directory.
///
/// Returns a list of created file paths.
#[tauri::command]
pub fn export_all_markdown(project: Project, output_dir: String) -> Result<Vec<String>, String> {
    let exports = generate_exports(&project).map_err(|e| e.to_string())?;

    let dir = Path::new(&output_dir);
    if !dir.exists() {
        fs::create_dir_all(dir).map_err(|e| format!("Cannot create directory: {}", e))?;
    }

    let mut paths = Vec::new();
    for export in &exports {
        let file_path = dir.join(&export.filename);
        fs::write(&file_path, &export.markdown)
            .map_err(|e| format!("Cannot write file {}: {}", export.filename, e))?;
        paths.push(file_path.to_string_lossy().to_string());
    }

    Ok(paths)
}

/// Exports all markdown files into a single zip archive.
///
/// Returns the path to the created zip file.
#[tauri::command]
pub fn export_all_zip(project: Project, output_zip_path: String) -> Result<String, String> {
    export_to_zip(&project, &output_zip_path).map_err(|e| e.to_string())
}

/// Saves a project to a JSON file.
#[tauri::command]
pub fn save_project(project: Project, path: String) -> Result<(), String> {
    let json = serde_json::to_string_pretty(&project)
        .map_err(|e| format!("Serialization error: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Cannot write project file: {}", e))?;
    Ok(())
}

/// Opens a project from a JSON file.
#[tauri::command]
pub fn open_project(path: String) -> Result<Project, String> {
    let content =
        fs::read_to_string(&path).map_err(|e| format!("Cannot read project file: {}", e))?;
    let project: Project =
        serde_json::from_str(&content).map_err(|e| format!("Invalid project file: {}", e))?;
    Ok(project)
}

#[tauri::command]
pub async fn ai_test_provider(config: AiProviderConfig) -> Result<(), AiErrorPayload> {
    ai::test_provider(&config).await
}

#[tauri::command]
pub async fn ai_list_models(config: AiProviderConfig) -> Result<Vec<String>, AiErrorPayload> {
    ai::list_models(&config).await
}

#[tauri::command]
pub async fn ai_rewrite_preview(
    project: Project,
    target_qa_id: String,
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
    let output = ai::rewrite_for_target(&project, &target_qa_id, cancel).await?;
    Ok(AiRewriteResult {
        markdown: output.markdown,
        model_used: model,
        provider,
        input_chars: output.input_chars,
    })
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
    })
}

#[tauri::command]
pub async fn ai_cancel_request() -> Result<bool, String> {
    Ok(ai::cancel_in_flight())
}

#[tauri::command]
pub fn ai_default_prompt() -> String {
    ai::default_rewrite_prompt().to_string()
}
