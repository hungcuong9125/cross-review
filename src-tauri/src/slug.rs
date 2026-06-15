/// Converts a name to a URL-safe slug suitable for filenames.
///
/// Rules:
/// - Convert to lowercase
/// - Replace spaces and underscores with hyphens
/// - Remove non-alphanumeric characters (except hyphens)
/// - Collapse multiple hyphens
/// - Trim leading/trailing hyphens
/// - Vietnamese characters are preserved as-is (UTF-8 filenames)
pub fn to_slug(name: &str) -> String {
    let slug = name
        .trim()
        .to_lowercase()
        .replace([' ', '_'], "-")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '.')
        .collect::<String>();

    let mut result = String::new();
    let mut last_was_hyphen = false;
    for c in slug.chars() {
        if c == '-' {
            if !last_was_hyphen {
                result.push(c);
            }
            last_was_hyphen = true;
        } else {
            result.push(c);
            last_was_hyphen = false;
        }
    }

    result.trim_matches('-').to_string()
}

/// Generates a unique filename for a QA target.
/// Format: `review-for-{slug}.md`
/// If the slug already exists in the used list, appends `-2`, `-3`, etc.
pub fn generate_filename(target_name: &str, used_filenames: &[String]) -> String {
    let slug = if target_name.trim().is_empty() {
        "unnamed".to_string()
    } else {
        to_slug(target_name)
    };

    let base = if slug.is_empty() {
        "unnamed".to_string()
    } else {
        slug
    };

    let candidate = format!("review-for-{}.md", base);
    if !used_filenames.contains(&candidate) {
        return candidate;
    }

    // Find next available suffix
    for i in 2..=1000 {
        let candidate = format!("review-for-{}-{}.md", base, i);
        if !used_filenames.contains(&candidate) {
            return candidate;
        }
    }

    // Fallback (should never happen in practice)
    format!("review-for-{}-{}.md", base, uuid::Uuid::new_v4())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_slug() {
        assert_eq!(to_slug("QA 1"), "qa-1");
        assert_eq!(to_slug("Team Growth"), "team-growth");
    }

    #[test]
    fn test_slug_with_special_chars() {
        assert_eq!(to_slug("QA @#$% 1!"), "qa-1");
        assert_eq!(to_slug("hello_world"), "hello-world");
    }

    #[test]
    fn test_slug_preserves_dots() {
        assert_eq!(to_slug("v2.0"), "v2.0");
    }

    #[test]
    fn test_generate_filename_basic() {
        let used = vec![];
        assert_eq!(generate_filename("QA 1", &used), "review-for-qa-1.md");
    }

    #[test]
    fn test_generate_filename_dedup() {
        let used = vec!["review-for-team-a.md".to_string()];
        assert_eq!(
            generate_filename("Team A", &used),
            "review-for-team-a-2.md"
        );
    }

    #[test]
    fn test_generate_filename_multiple_dedup() {
        let used = vec![
            "review-for-team-a.md".to_string(),
            "review-for-team-a-2.md".to_string(),
        ];
        assert_eq!(
            generate_filename("Team A", &used),
            "review-for-team-a-3.md"
        );
    }

    #[test]
    fn test_generate_filename_empty_name() {
        let used = vec![];
        assert_eq!(generate_filename("", &used), "review-for-unnamed.md");
    }

    #[test]
    fn test_vietnamese_slug() {
        let slug = to_slug("Đội QA số 1");
        assert!(slug.contains("đội") || slug.contains("qa"));
        assert!(generate_filename("Đội QA số 1", &[]).starts_with("review-for-"));
    }
}
