import type { Project } from "./api";

const KEY_SCRUB_FLAG = "review-weaver-api-key-scrubbed";

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

export function recordScrubIfNeeded(original: Project): void {
  try {
    const cfg = original.ai_config;
    if (cfg && cfg.kind === "ollama") {
      localStorage.removeItem(KEY_SCRUB_FLAG);
      return;
    }
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

export function isApiKeyScrubbed(): boolean {
  try {
    return localStorage.getItem(KEY_SCRUB_FLAG) === "true";
  } catch {
    return false;
  }
}

export function clearApiKeyScrubbed(): void {
  try {
    localStorage.removeItem(KEY_SCRUB_FLAG);
  } catch {
    // ignore
  }
}
