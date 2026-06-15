use serde::{Deserialize, Serialize};

/// Represents a complete Review Weaver project.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    #[serde(default)]
    pub title: String,
    #[serde(default = "default_opening")]
    pub opening_text: String,
    #[serde(default = "default_closing")]
    pub closing_text: String,
    #[serde(default)]
    pub qa_reports: Vec<QaReport>,
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
    "---\n\nTôi thì đang nghiêng về việc xây dựng một Node dạng Brief Collector để lưu dữ liệu cho toàn bộ cuộc nói chuyện. Ví dụ user có thể tải lên tệp PDF mới, tài liệu docs mới, hình ảnh hoặc các tệp đính kèm khác. Các dữ liệu này cần được lưu xuyên suốt trong cuộc trò chuyện, sau đó hệ thống mới cân nhắc có cần bổ sung thông tin còn thiếu hay không, rồi mới chuyển sang sửa prompt đầy đủ và gửi Main LLM trả lời.\n\nCác tệp tài liệu sẽ là context xuyên suốt của cuộc trò chuyện.\n".to_string()
}

impl Default for Project {
    fn default() -> Self {
        Self {
            title: String::new(),
            opening_text: default_opening(),
            closing_text: default_closing(),
            qa_reports: Vec::new(),
        }
    }
}
