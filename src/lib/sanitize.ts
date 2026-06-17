import type { Project } from "./api";

const KEY_SCRUB_FLAG = "review-weaver-api-key-scrubbed";

/**
 * Strip the API key from a project before writing to localStorage.
 * Returns a shallow copy; does not mutate the input.
 */
export function sanitizeForStorage(project: Project): Project {
  if (!project.ai_config) return project;
  return {
    ...project,
    ai_config: {
      ...project.ai_config,
      api_key: "",
    },
  };
}

/**
 * Set or clear the persistent `review-weaver-api-key-scrubbed` flag
 * so the reload banner can fire after a page refresh / app restart.
 *
 * Call with the ORIGINAL project (before sanitization) — the function
 * checks whether the original had a non-empty key that will be stripped.
 */
export function recordScrubIfNeeded(original: Project): void {
  try {
    const cfg = original.ai_config;
    // Ollama doesn't require an API key — don't show the "key missing" banner for it.
    if (cfg && cfg.kind === "ollama") {
      localStorage.removeItem(KEY_SCRUB_FLAG);
      return;
    }
    // Only set the flag if the user actually had a key configured
    const keyWasPresent = !!cfg && cfg.api_key.trim() !== "";
    if (keyWasPresent) {
      localStorage.setItem(KEY_SCRUB_FLAG, "true");
    } else {
      localStorage.removeItem(KEY_SCRUB_FLAG);
    }
  } catch {
    // localStorage may throw in private mode
  }
}

/**
 * Check whether the API key was scrubbed from a previous session.
 */
export function isApiKeyScrubbed(): boolean {
  try {
    return localStorage.getItem(KEY_SCRUB_FLAG) === "true";
  } catch {
    return false;
  }
}

/**
 * Clear the scrub flag (e.g. when user re-enters key or opens from disk).
 */
export function clearApiKeyScrubbed(): void {
  try {
    localStorage.removeItem(KEY_SCRUB_FLAG);
  } catch {
    // ignore
  }
}
