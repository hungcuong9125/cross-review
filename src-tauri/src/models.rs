use serde::{Deserialize, Serialize};

// --- AI provider domain types ---

/// Identifies which provider adapter to use.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AiProviderKind {
    Ollama,
    Openai,
    Anthropic,
    Gemini,
    Deepseek,
    Mimo,
    Opencodego,
    OpenaiCompatible,
}

impl AiProviderKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Ollama => "ollama",
            Self::Openai => "openai",
            Self::Anthropic => "anthropic",
            Self::Gemini => "gemini",
            Self::Deepseek => "deepseek",
            Self::Mimo => "mimo",
            Self::Opencodego => "opencodego",
            Self::OpenaiCompatible => "openaicompatible",
        }
    }
}

fn default_kind() -> AiProviderKind {
    AiProviderKind::Ollama
}

/// One AI provider configuration (v1: exactly one per project).
#[derive(Clone, Serialize, Deserialize)]
pub struct AiProviderConfig {
    #[serde(default = "default_kind")]
    pub kind: AiProviderKind,
    #[serde(default)]
    pub base_url: String,
    #[serde(default)]
    pub api_key: String,
    #[serde(default)]
    pub model: String,
    #[serde(default)]
    pub system_prompt: String,
    #[serde(default = "default_max_input_chars")]
    pub max_input_chars: usize,
    /// Reasoning effort level: "none", "low", "medium", "high", "max". Empty = none.
    #[serde(default)]
    pub thinking_effort: String,
    /// When true, prepend Vietnamese instruction to the system prompt.
    #[serde(default)]
    pub translate_vietnamese: bool,
    /// When true, strip CJK characters from AI output.
    #[serde(default)]
    pub remove_chinese: bool,
}

fn default_max_input_chars() -> usize {
    500_000
}

/// Manual Debug impl that redacts api_key - NEVER derive Debug on this struct.
impl std::fmt::Debug for AiProviderConfig {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let key_set = !self.api_key.is_empty();
        f.debug_struct("AiProviderConfig")
            .field("kind", &self.kind)
            .field("base_url", &self.base_url)
            .field("api_key", &format_args!("<REDACTED set={}>", key_set))
            .field("model", &self.model)
            .field("system_prompt", &self.system_prompt)
            .field("max_input_chars", &self.max_input_chars)
            .field("thinking_effort", &self.thinking_effort)
            .field("translate_vietnamese", &self.translate_vietnamese)
            .field("remove_chinese", &self.remove_chinese)
            .finish()
    }
}

/// Result of a single rewrite call. Frontend switches on code.
///
/// Custom Serialize outputs just the tag string (e.g. `"not_configured"`) so
/// the TypeScript `AiErrorCode` string-union type matches on the wire.
/// Variant data (chars, max, seconds, message) is embedded into the
/// `AiErrorPayload.message` field instead.
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub enum AiErrorCode {
    NotConfigured,
    NoSources,
    TargetNotFound,
    InputTooLarge { chars: usize, max: usize },
    Timeout { seconds: u64 },
    Provider { message: String },
    EmptyResponse,
    Cancelled,
}

impl Serialize for AiErrorCode {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let tag = match self {
            AiErrorCode::NotConfigured => "not_configured",
            AiErrorCode::NoSources => "no_sources",
            AiErrorCode::TargetNotFound => "target_not_found",
            AiErrorCode::InputTooLarge { .. } => "input_too_large",
            AiErrorCode::Timeout { .. } => "timeout",
            AiErrorCode::Provider { .. } => "provider",
            AiErrorCode::EmptyResponse => "empty_response",
            AiErrorCode::Cancelled => "cancelled",
        };
        serializer.serialize_str(tag)
    }
}

impl<'de> Deserialize<'de> for AiErrorCode {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let s = String::deserialize(deserializer)?;
        match s.as_str() {
            "not_configured" => Ok(AiErrorCode::NotConfigured),
            "no_sources" => Ok(AiErrorCode::NoSources),
            "target_not_found" => Ok(AiErrorCode::TargetNotFound),
            "input_too_large" => Ok(AiErrorCode::InputTooLarge { chars: 0, max: 0 }),
            "timeout" => Ok(AiErrorCode::Timeout { seconds: 0 }),
            "provider" => Ok(AiErrorCode::Provider { message: String::new() }),
            "empty_response" => Ok(AiErrorCode::EmptyResponse),
            "cancelled" => Ok(AiErrorCode::Cancelled),
            other => Err(serde::de::Error::unknown_variant(
                other,
                &[
                    "not_configured",
                    "no_sources",
                    "target_not_found",
                    "input_too_large",
                    "timeout",
                    "provider",
                    "empty_response",
                    "cancelled",
                ],
            )),
        }
    }
}

/// Wire-format error. Frontend sees this.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiErrorPayload {
    pub code: AiErrorCode,
    pub message: String,
}

/// Result of a rewrite call.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiRewriteResult {
    pub markdown: String,
    pub model_used: String,
    pub provider: String,
    pub input_chars: usize,
}

// --- End AI provider domain types ---

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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub opening_text: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub closing_text: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ai_config: Option<AiProviderConfig>,
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
            ai_config: None,
        }
    }
}

/// Captured debug information from an AI provider call.
#[derive(Clone, Serialize, Deserialize)]
pub struct DebugLog {
    pub timestamp: String,
    pub provider: String,
    pub model: String,
    pub thinking_effort: String,
    pub request_messages: String,
    pub response_text: String,
    pub duration_ms: u64,
    pub success: bool,
}

/// Application-level settings for import/export (AI config + UI toggles).
#[derive(Clone, Serialize, Deserialize)]
pub struct AppSettings {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ai_config: Option<AiProviderConfig>,
    #[serde(default)]
    pub compact_mode: bool,
    #[serde(default)]
    pub remove_whitespace: bool,
    #[serde(default)]
    pub merge_lines: bool,
    #[serde(default = "default_preview_format")]
    pub preview_format: String,
    #[serde(default)]
    pub translate_vietnamese: bool,
    #[serde(default)]
    pub remove_chinese: bool,
    #[serde(default)]
    pub debug_enabled: bool,
}

fn default_preview_format() -> String {
    "html".to_string()
}
