import type { Project } from "./api";

const KEY_SCRUB_FLAG = "review-weaver-api-key-scrubbed";

export function sanitizeForStorage(project: Project): Project {
  if (!project.ai_config) return project;
  return {
    ...project,
    ai_config: { ...project.ai_config, api_key: "" },
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

const BINARY_BYTES = /[\x00-\x08\x0E-\x1F\x7F\xFF]/;
const MARKDOWN_STRUCTURE = /#+\s|(^|\n)[-*]\s|(^|\n)\d+\.\s|\*\*|\[.*\]\(.*\)/;

export function isValidMarkdownReport(filename: string, content: string): boolean {
  if (!filename.toLowerCase().endsWith(".md")) return false;
  if (BINARY_BYTES.test(content.slice(0, 1000))) return false;
  if (content.includes("review-weaver-signature")) return true;
  if (content.includes("## 1.") || filename.toLowerCase().includes("review-for")) return true;
  return MARKDOWN_STRUCTURE.test(content);
}
