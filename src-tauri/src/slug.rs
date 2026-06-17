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
fn local_timestamp() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // Convert to approximate local time (UTC+7 for Vietnam, or use offset)
    // Simple approach: use UTC and format
    let secs = now % 60;
    let mins = (now / 60) % 60;
    let hours = (now / 3600) % 24;
    let days_total = now / 86400;

    // Days since epoch to Y-M-D (simplified leap year calculation)
    let mut y = 1970i64;
    let mut remaining = days_total as i64;
    loop {
        let days_in_year = if y % 4 == 0 && (y % 100 != 0 || y % 400 == 0) { 366 } else { 365 };
        if remaining < days_in_year { break; }
        remaining -= days_in_year;
        y += 1;
    }
    let is_leap = y % 4 == 0 && (y % 100 != 0 || y % 400 == 0);
    let days_in_month = [31, if is_leap { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut m = 0usize;
    while m < 12 && remaining >= days_in_month[m] {
        remaining -= days_in_month[m];
        m += 1;
    }
    format!(
        "{:04}{:02}{:02}-{:02}{:02}{:02}",
        y, m + 1, remaining + 1, hours, mins, secs
    )
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
