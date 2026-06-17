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
 * Call AFTER `sanitizeForStorage()` has been applied to the draft.
 */
export function recordScrubIfNeeded(scrubbedDraft: Project): void {
  try {
    const cfg = scrubbedDraft.ai_config;
    const hasNonSensitiveFields = !!cfg && (
      cfg.kind !== "ollama" ||
      cfg.base_url.trim() !== "" ||
      cfg.model.trim() !== "" ||
      cfg.system_prompt.trim() !== "" ||
      (cfg.max_input_chars !== undefined && cfg.max_input_chars !== 50000)
    );
    const keyWasStripped = !!cfg && cfg.api_key === "";
    if (hasNonSensitiveFields && keyWasStripped) {
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
