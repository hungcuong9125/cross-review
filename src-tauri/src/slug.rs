/// Converts a name to a URL-safe slug suitable for filenames.
/// Vietnamese characters are preserved as-is (UTF-8 filenames).
pub fn to_slug(name: &str) -> String {
    let slug = name
        .trim()
        .to_lowercase()
        .replace([' ', '_'], "-")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '.')
        .take(200) // Cap slug length to stay within filesystem limits
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

/// Returns a local timestamp string `YYYYMMDD-HHmmss`.
/// Uses the system's local timezone.
fn local_timestamp() -> String {
    let now = chrono::Local::now();
    now.format("%Y%m%d-%H%M%S").to_string()
}

/// Generates a unique filename for a QA target.
/// Format: `review-for-{slug}-{timestamp}.md`
/// If the slug already exists in the used list, appends `-2`, `-3`, etc.
pub fn generate_filename(target_name: &str, used_filenames: &[String]) -> String {
    let slug = to_slug(target_name);
    let base = if slug.is_empty() {
        "unnamed".to_string()
    } else {
        slug
    };

    let ts = local_timestamp();
    let candidate = format!("review-for-{}-{}.md", base, ts);
    if !used_filenames.contains(&candidate) {
        return candidate;
    }

    // Same-second collision: append numeric suffix
    for i in 2..=1000 {
        let candidate = format!("review-for-{}-{}-{}.md", base, ts, i);
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
        let name = generate_filename("QA 1", &used);
        assert!(name.starts_with("review-for-qa-1-"), "expected timestamp prefix, got: {name}");
        assert!(name.ends_with(".md"), "expected .md suffix, got: {name}");
    }

    #[test]
    fn test_generate_filename_dedup() {
        let ts = local_timestamp();
        let used = vec![format!("review-for-team-a-{}.md", ts)];
        let name = generate_filename("Team A", &used);
        assert!(
            name == format!("review-for-team-a-{}-2.md", ts),
            "expected numeric dedup, got: {name}"
        );
    }

    #[test]
    fn test_generate_filename_multiple_dedup() {
        let ts = local_timestamp();
        let used = vec![
            format!("review-for-team-a-{}.md", ts),
            format!("review-for-team-a-{}-2.md", ts),
        ];
        let name = generate_filename("Team A", &used);
        assert!(
            name == format!("review-for-team-a-{}-3.md", ts),
            "expected numeric dedup 3, got: {name}"
        );
    }

    #[test]
    fn test_generate_filename_empty_name() {
        let used = vec![];
        let name = generate_filename("", &used);
        assert!(name.starts_with("review-for-unnamed-"), "expected timestamp prefix, got: {name}");
    }

    #[test]
    fn test_vietnamese_slug() {
        let slug = to_slug("Đội QA số 1");
        assert!(slug.contains("đội"), "Vietnamese diacritics should be preserved, got: {}", slug);
        assert!(slug.contains("số"), "Vietnamese diacritics should be preserved, got: {}", slug);
        assert!(generate_filename("Đội QA số 1", &[]).starts_with("review-for-"));
    }

    #[test]
    fn test_timestamp_format() {
        let ts = local_timestamp();
        assert_eq!(ts.len(), 15, "expected YYYYMMDD-HHmmss (15 chars), got: {ts}");
        assert!(ts.contains('-'), "expected hyphen separator, got: {ts}");
    }
}
