use thiserror::Error;

use crate::models::{ExportFile, Project};
use crate::slug::generate_filename;
use crate::validation::validate_project;

#[derive(Debug, Error)]
pub enum ExportError {
    #[error("Validation failed: {0}")]
    ValidationFailed(String),
    #[error("QA with id '{0}' not found")]
    QaNotFound(String),
}

/// Generates export files for all QA teams.
///
/// For each QA target, creates a markdown file containing:
/// 1. Opening text
/// 2. Reports from all OTHER QA teams (not the target)
/// 3. Closing text
///
/// Returns exactly N files for N QA teams.
pub fn generate_exports(project: &Project) -> Result<Vec<ExportFile>, ExportError> {
    // Validate first
    let validation = validate_project(project);
    if !validation.valid {
        return Err(ExportError::ValidationFailed(validation.errors.join("; ")));
    }

    let mut exports = Vec::new();
    let mut used_filenames: Vec<String> = Vec::new();

    for target in &project.qa_reports {
        // Collect other reports (exclude the target QA)
        let other_reports: Vec<&crate::models::QaReport> = project
            .qa_reports
            .iter()
            .filter(|qa| qa.id != target.id)
            .collect();

        // Generate filename
        let filename = generate_filename(&target.name, &used_filenames);
        used_filenames.push(filename.clone());

        // Build markdown
        let markdown = build_markdown(project, &other_reports);

        exports.push(ExportFile {
            target_qa_id: target.id.clone(),
            filename,
            markdown,
        });
    }

    Ok(exports)
}

/// Generates a preview export for a single QA target.
pub fn generate_preview(
    project: &Project,
    target_qa_id: &str,
) -> Result<ExportFile, ExportError> {
    let target = project
        .qa_reports
        .iter()
        .find(|qa| qa.id == target_qa_id)
        .ok_or_else(|| ExportError::QaNotFound(target_qa_id.to_string()))?;

    let other_reports: Vec<&crate::models::QaReport> = project
        .qa_reports
        .iter()
        .filter(|qa| qa.id != target.id)
        .collect();

    let filename = generate_filename(&target.name, &[]);
    let markdown = build_markdown(project, &other_reports);

    Ok(ExportFile {
        target_qa_id: target.id.clone(),
        filename,
        markdown,
    })
}

/// Builds the final markdown string from project parts.
fn build_markdown(
    project: &Project,
    other_reports: &[&crate::models::QaReport],
) -> String {
    let mut parts: Vec<String> = Vec::new();

    // Opening text
    let opening = project.opening_text.trim();
    if !opening.is_empty() {
        parts.push(opening.to_string());
    }

    // Other QA reports with separators
    for (i, qa) in other_reports.iter().enumerate() {
        let mut section = String::new();

        // Add separator before each report (not before the first)
        if i > 0 || !opening.is_empty() {
            section.push_str("\n---\n\n");
        }

        section.push_str(&format!("## Báo cáo từ {}\n\n", qa.name));
        section.push_str(qa.content.trim());

        parts.push(section);
    }

    // Closing text
    let closing = project.closing_text.trim();
    if !closing.is_empty() {
        parts.push(format!("\n\n---\n\n{}", closing));
    }

    parts.join("\n\n")
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

    fn make_project(qas: Vec<QaReport>) -> Project {
        Project {
            title: "Test Project".to_string(),
            opening_text: "Opening text".to_string(),
            closing_text: "Closing text".to_string(),
            qa_reports: qas,
        }
    }

    // Test 1: 5 QA normal case
    #[test]
    fn test_five_qa_exports() {
        let qas: Vec<QaReport> = (1..=5)
            .map(|i| make_qa(&i.to_string(), &format!("QA {}", i), &format!("Report {}", i)))
            .collect();
        let project = make_project(qas);
        let exports = generate_exports(&project).unwrap();

        assert_eq!(exports.len(), 5);

        for (i, export) in exports.iter().enumerate() {
            let target_num = i + 1;
            // Must not contain own report
            assert!(
                !export.markdown.contains(&format!("Report {}", target_num)),
                "Export for QA {} should not contain its own report",
                target_num
            );
            // Must contain other 4 reports
            for j in 1..=5 {
                if j != target_num {
                    assert!(
                        export.markdown.contains(&format!("Report {}", j)),
                        "Export for QA {} should contain report from QA {}",
                        target_num,
                        j
                    );
                }
            }
            // Must have opening and closing
            assert!(export.markdown.starts_with("Opening text"));
            assert!(export.markdown.contains("Closing text"));
        }
    }

    // Test 2: 2 QA case
    #[test]
    fn test_two_qa_exports() {
        let qas = vec![
            make_qa("1", "QA 1", "Report A"),
            make_qa("2", "QA 2", "Report B"),
        ];
        let project = make_project(qas);
        let exports = generate_exports(&project).unwrap();

        assert_eq!(exports.len(), 2);

        // File for QA 1 should only contain QA 2's report
        assert!(exports[0].markdown.contains("Report B"));
        assert!(!exports[0].markdown.contains("Report A"));

        // File for QA 2 should only contain QA 1's report
        assert!(exports[1].markdown.contains("Report A"));
        assert!(!exports[1].markdown.contains("Report B"));
    }

    // Test 3: Missing content validation
    #[test]
    fn test_missing_content_errors() {
        let qas = vec![
            make_qa("1", "QA 1", ""),
            make_qa("2", "QA 2", "Content"),
        ];
        let project = make_project(qas);
        let result = generate_exports(&project);
        assert!(result.is_err());
    }

    // Test 4: Duplicate names produce unique filenames
    #[test]
    fn test_duplicate_names_unique_filenames() {
        let qas = vec![
            make_qa("1", "Team Growth", "Report 1"),
            make_qa("2", "Team Growth", "Report 2"),
            make_qa("3", "Team Growth", "Report 3"),
        ];
        let project = make_project(qas);
        let exports = generate_exports(&project).unwrap();

        assert_eq!(exports.len(), 3);

        // All filenames must be unique
        let filenames: Vec<&str> = exports.iter().map(|e| e.filename.as_str()).collect();
        let mut unique_filenames = filenames.clone();
        unique_filenames.sort();
        unique_filenames.dedup();
        assert_eq!(filenames.len(), unique_filenames.len());

        // First should be review-for-team-growth.md
        assert_eq!(exports[0].filename, "review-for-team-growth.md");
        // Second should have -2 suffix
        assert_eq!(exports[1].filename, "review-for-team-growth-2.md");
        // Third should have -3 suffix
        assert_eq!(exports[2].filename, "review-for-team-growth-3.md");
    }

    // Test 5: Long markdown with code blocks, tables, headings preserved
    #[test]
    fn test_long_markdown_preserved() {
        let long_content = r#"# Main Heading

Some intro text.

## Sub Heading

| Col1 | Col2 | Col3 |
|------|------|------|
| A    | B    | C    |
| D    | E    | F    |

```rust
fn main() {
    println!("Hello, world!");
    let x = 42;
    let y = vec![1, 2, 3];
}
```

> Blockquote with **bold** and *italic*

- List item 1
- List item 2
  - Nested item

---

Final paragraph with [link](https://example.com)."#;

        let qas = vec![
            make_qa("1", "QA 1", long_content),
            make_qa("2", "QA 2", "Short report"),
        ];
        let project = make_project(qas);
        let exports = generate_exports(&project).unwrap();

        // QA 2's file should contain the full long content from QA 1
        let qa2_export = &exports[1];
        assert!(qa2_export.markdown.contains("# Main Heading"));
        assert!(qa2_export.markdown.contains("| Col1 | Col2 | Col3 |"));
        assert!(qa2_export.markdown.contains("```rust"));
        assert!(qa2_export.markdown.contains("println!(\"Hello, world!\");"));
        assert!(qa2_export.markdown.contains("> Blockquote"));
        assert!(qa2_export.markdown.contains("- List item 1"));
        assert!(qa2_export.markdown.contains("[link](https://example.com)"));
    }

    // Test 6: Vietnamese UTF-8
    #[test]
    fn test_vietnamese_unicode() {
        let qas = vec![
            make_qa(
                "1",
                "Đội QA số 1",
                "Báo cáo của đội 1: Đây là nội dung tiếng Việt có dấu.",
            ),
            make_qa(
                "2",
                "Đội QA số 2",
                "Báo cáo của đội 2: Kiểm tra Unicode Nguyễn Văn A.",
            ),
        ];
        let project = make_project(qas);
        let exports = generate_exports(&project).unwrap();

        assert_eq!(exports.len(), 2);

        // Check Vietnamese content is preserved
        let export1 = &exports[0];
        assert!(export1.markdown.contains("Đội QA số 2"));
        assert!(export1.markdown.contains("Kiểm tra Unicode Nguyễn Văn A"));

        let export2 = &exports[1];
        assert!(export2.markdown.contains("Đội QA số 1"));
        assert!(export2.markdown.contains("Đây là nội dung tiếng Việt có dấu"));

        // Check filenames handle Vietnamese
        assert!(export1.filename.starts_with("review-for-"));
        assert!(export2.filename.starts_with("review-for-"));
    }

    // Test: Number of exported files equals number of QA
    #[test]
    fn test_export_count_matches_qa_count() {
        for n in 2..=10 {
            let qas: Vec<QaReport> = (1..=n)
                .map(|i| make_qa(&i.to_string(), &format!("QA {}", i), &format!("Content {}", i)))
                .collect();
            let project = make_project(qas);
            let exports = generate_exports(&project).unwrap();
            assert_eq!(exports.len(), n, "Should export {} files for {} QAs", n, n);
        }
    }

    // Test: No file contains its own QA's report
    #[test]
    fn test_no_self_report() {
        let qas: Vec<QaReport> = (1..=5)
            .map(|i| {
                make_qa(
                    &i.to_string(),
                    &format!("QA {}", i),
                    &format!("UNIQUE_MARKER_{}", i),
                )
            })
            .collect();
        let project = make_project(qas);
        let exports = generate_exports(&project).unwrap();

        for (i, export) in exports.iter().enumerate() {
            let marker = format!("UNIQUE_MARKER_{}", i + 1);
            assert!(
                !export.markdown.contains(&marker),
                "Export {} should not contain marker {}",
                i + 1,
                marker
            );
        }
    }

    // Test: Preview matches export for same target
    #[test]
    fn test_preview_matches_export() {
        let qas = vec![
            make_qa("1", "QA 1", "R1"),
            make_qa("2", "QA 2", "R2"),
            make_qa("3", "QA 3", "R3"),
        ];
        let project = make_project(qas);

        let exports = generate_exports(&project).unwrap();
        let preview = generate_preview(&project, "2").unwrap();

        // Preview for QA 2 should have same content as export for QA 2
        assert_eq!(exports[1].markdown, preview.markdown);
    }
}
