use serde::{Deserialize, Serialize};

/// Position of a component in the exported markdown.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ComponentPosition {
    Opening,
    Closing,
}

fn default_true() -> bool {
    true
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
    #[serde(default = "default_true")]
    pub active: bool,
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
    #[serde(default = "default_true")]
    pub exclude_self: bool,
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
    #[serde(default = "default_true")]
    pub active: bool,
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

impl Default for Project {
    fn default() -> Self {
        Self {
            title: String::new(),
            components: Vec::new(),
            qa_reports: Vec::new(),
            exclude_self: true,
            opening_text: None,
            closing_text: None,
        }
    }
}
