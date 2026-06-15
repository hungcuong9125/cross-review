use serde::{Deserialize, Serialize};

/// Position of a component in the exported markdown.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ComponentPosition {
    Opening,
    Closing,
}

/// A reusable component (section) that can be inserted at the opening or closing.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Component {
    pub id: String,
    #[serde(default)]
    pub name: String,
    pub position: ComponentPosition,
    #[serde(default)]
    pub content: String,
    #[serde(default)]
    pub order: i32,
}

/// Represents a complete Review Weaver project.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub components: Vec<Component>,
    #[serde(default)]
    pub qa_reports: Vec<QaReport>,
    // Legacy fields for backward compatibility with old project files
    #[allow(dead_code)]
    #[serde(default, skip_serializing)]
    pub opening_text: Option<String>,
    #[allow(dead_code)]
    #[serde(default, skip_serializing)]
    pub closing_text: Option<String>,
}

/// A single QA team's report.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QaReport {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub content: String,
}

/// A generated export file ready to be written to disk.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportFile {
    pub target_qa_id: String,
    pub filename: String,
    pub markdown: String,
}

/// Validation result with errors and warnings.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationReport {
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

fn default_opening() -> String {
    "Hãy xem một số báo cáo từ QA sau và REVIEW thêm, đề xuất phương án cuối:\n".to_string()
}

fn default_closing() -> String {
    "Hãy tổng hợp và đề xuất phương án cuối cùng dựa trên các báo cáo trên.\n".to_string()
}

impl Default for Project {
    fn default() -> Self {
        Self {
            title: String::new(),
            components: vec![
                Component {
                    id: uuid::Uuid::new_v4().to_string(),
                    name: "Mở đầu".to_string(),
                    position: ComponentPosition::Opening,
                    content: default_opening(),
                    order: 0,
                },
                Component {
                    id: uuid::Uuid::new_v4().to_string(),
                    name: "Kết thúc".to_string(),
                    position: ComponentPosition::Closing,
                    content: default_closing(),
                    order: 0,
                },
            ],
            qa_reports: Vec::new(),
            opening_text: None,
            closing_text: None,
        }
    }
}
