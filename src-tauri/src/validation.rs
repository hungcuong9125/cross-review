use crate::models::{Project, ValidationReport};

/// Validates a project and returns a report with errors and warnings.
///
/// Errors block export. Warnings are informational.
pub fn validate_project(project: &Project) -> ValidationReport {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    // Must have at least 2 QA teams for cross-review
    if project.qa_reports.is_empty() {
        errors.push("Chưa có QA nào. Cần ít nhất 2 QA để review chéo.".to_string());
    } else if project.qa_reports.len() < 2 {
        errors.push(
            "Chỉ có 1 QA, không thể review chéo. Cần ít nhất 2 QA.".to_string(),
        );
    }

    // Check each QA report
    for (i, qa) in project.qa_reports.iter().enumerate() {
        let label = if qa.name.is_empty() {
            format!("QA #{}", i + 1)
        } else {
            qa.name.clone()
        };

        if qa.name.trim().is_empty() {
            errors.push(format!("{}: thiếu tên.", label));
        }
        if qa.content.trim().is_empty() {
            errors.push(format!("{}: thiếu nội dung báo cáo.", label));
        }
    }

    // Check for duplicate names
    let mut names: Vec<(usize, &str)> = project
        .qa_reports
        .iter()
        .enumerate()
        .filter_map(|(i, qa)| {
            if qa.name.trim().is_empty() {
                None
            } else {
                Some((i, qa.name.trim()))
            }
        })
        .collect();

    names.sort_by_key(|(_, name)| name.to_lowercase());

    for window in names.windows(2) {
        if window[0].1.to_lowercase() == window[1].1.to_lowercase() {
            warnings.push(format!(
                "Tên QA trùng nhau: \"{}\" (QA #{} và QA #{}). File export sẽ tự động đánh số để tránh trùng tên.",
                window[0].1,
                window[0].0 + 1,
                window[1].0 + 1
            ));
        }
    }

    // Warnings for empty opening/closing
    if project.opening_text.trim().is_empty() {
        warnings.push("Phần mở đầu đang trống.".to_string());
    }
    if project.closing_text.trim().is_empty() {
        warnings.push("Phần kết thúc đang trống.".to_string());
    }

    let valid = errors.is_empty();

    ValidationReport {
        valid,
        errors,
        warnings,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::QaReport;

    fn make_qa(id: &str, name: &str, content: &str) -> QaReport {
        QaReport {
            id: id.to_string(),
            name: name.to_string(),
            content: content.to_string(),
        }
    }

    #[test]
    fn test_empty_project_is_invalid() {
        let project = Project::default();
        let report = validate_project(&project);
        assert!(!report.valid);
        assert!(report.errors.iter().any(|e| e.contains("Chưa có QA")));
    }

    #[test]
    fn test_single_qa_is_invalid() {
        let mut project = Project::default();
        project.qa_reports.push(make_qa("1", "QA 1", "Content"));
        let report = validate_project(&project);
        assert!(!report.valid);
        assert!(report.errors.iter().any(|e| e.contains("1 QA")));
    }

    #[test]
    fn test_two_valid_qa_is_valid() {
        let mut project = Project::default();
        project.qa_reports.push(make_qa("1", "QA 1", "Content 1"));
        project.qa_reports.push(make_qa("2", "QA 2", "Content 2"));
        let report = validate_project(&project);
        assert!(report.valid);
        assert!(report.errors.is_empty());
    }

    #[test]
    fn test_missing_name_is_error() {
        let mut project = Project::default();
        project.qa_reports.push(make_qa("1", "", "Content 1"));
        project.qa_reports.push(make_qa("2", "QA 2", "Content 2"));
        let report = validate_project(&project);
        assert!(!report.valid);
        assert!(report.errors.iter().any(|e| e.contains("thiếu tên")));
    }

    #[test]
    fn test_missing_content_is_error() {
        let mut project = Project::default();
        project.qa_reports.push(make_qa("1", "QA 1", ""));
        project.qa_reports.push(make_qa("2", "QA 2", "Content 2"));
        let report = validate_project(&project);
        assert!(!report.valid);
        assert!(report.errors.iter().any(|e| e.contains("thiếu nội dung")));
    }

    #[test]
    fn test_duplicate_names_is_warning() {
        let mut project = Project::default();
        project.qa_reports.push(make_qa("1", "Team A", "Content 1"));
        project.qa_reports.push(make_qa("2", "Team A", "Content 2"));
        let report = validate_project(&project);
        assert!(report.valid); // not an error, just a warning
        assert!(report.warnings.iter().any(|w| w.contains("trùng")));
    }

    #[test]
    fn test_empty_opening_closing_are_warnings() {
        let mut project = Project::default();
        project.opening_text = String::new();
        project.closing_text = String::new();
        project.qa_reports.push(make_qa("1", "QA 1", "C1"));
        project.qa_reports.push(make_qa("2", "QA 2", "C2"));
        let report = validate_project(&project);
        assert!(report.valid);
        assert!(report.warnings.iter().any(|w| w.contains("mở đầu")));
        assert!(report.warnings.iter().any(|w| w.contains("kết thúc")));
    }
}
