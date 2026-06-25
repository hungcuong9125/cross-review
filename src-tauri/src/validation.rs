use crate::models::{ComponentPosition, Project, ValidationReport};

pub fn validate_project(project: &Project) -> ValidationReport {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    let active_reports: Vec<&crate::models::QaReport> = project
        .qa_reports
        .iter()
        .filter(|qa| qa.active)
        .collect();

    if active_reports.is_empty() {
        errors.push("No active sources yet. Need at least 2 active sources for cross-review. / Chưa có nguồn hoạt động nào. Cần ít nhất 2 nguồn hoạt động để review chéo.".to_string());
    } else if active_reports.len() < 2 {
        errors.push(
            "Only 1 active source, cannot cross-review. Need at least 2. / Chỉ có 1 nguồn hoạt động, không thể review chéo. Cần ít nhất 2 nguồn hoạt động.".to_string(),
        );
    }

    let mut active_index = 0;
    for qa in &project.qa_reports {
        if !qa.active {
            continue;
        }
        active_index += 1;
        let label = if qa.name.trim().is_empty() {
            format!("Source #{}", active_index)
        } else {
            qa.name.clone()
        };

        if qa.name.trim().is_empty() {
            errors.push(format!("{}: missing name. / thiếu tên.", label));
        }
        if qa.content.trim().is_empty() {
            errors.push(format!("{}: missing content. / thiếu nội dung.", label));
        }
    }

    let mut names: Vec<(usize, &str)> = project
        .qa_reports
        .iter()
        .enumerate()
        .filter_map(|(i, qa)| {
            if !qa.active || qa.name.trim().is_empty() {
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
                "Duplicate source name: \"{}\" (Source #{} and Source #{}). Filenames will be auto-numbered. / Tên nguồn trùng nhau: \"{}\" (Nguồn #{} và Nguồn #{}). File export sẽ tự động đánh số để tránh trùng tên.",
                window[0].1, window[0].0 + 1, window[1].0 + 1,
                window[0].1, window[0].0 + 1, window[1].0 + 1
            ));
        }
    }

    let has_opening = project.components.iter().any(|c| {
        c.position == ComponentPosition::Opening && !c.content.trim().is_empty() && c.active
    });
    let has_closing = project.components.iter().any(|c| {
        c.position == ComponentPosition::Closing && !c.content.trim().is_empty() && c.active
    });

    if !has_opening {
        warnings.push("No active opening section. / Phần mở đầu hoạt động đang trống.".to_string());
    }
    if !has_closing {
        warnings.push("No active closing section. / Phần kết thúc hoạt động đang trống.".to_string());
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
            active: true,
        }
    }

    #[test]
    fn test_empty_project_is_invalid() {
        let project = Project::default();
        let report = validate_project(&project);
        assert!(!report.valid);
        assert!(report.errors.iter().any(|e| e.contains("Chưa có nguồn")));
    }

    #[test]
    fn test_single_qa_is_invalid() {
        let mut project = Project::default();
        project.qa_reports.push(make_qa("1", "QA 1", "Content"));
        let report = validate_project(&project);
        assert!(!report.valid);
        assert!(report.errors.iter().any(|e| e.contains("1 nguồn")));
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
        project.components = Vec::new();
        project.qa_reports.push(make_qa("1", "QA 1", "C1"));
        project.qa_reports.push(make_qa("2", "QA 2", "C2"));
        let report = validate_project(&project);
        assert!(report.valid);
        assert!(report.warnings.iter().any(|w| w.contains("mở đầu")));
        assert!(report.warnings.iter().any(|w| w.contains("kết thúc")));
    }
}
