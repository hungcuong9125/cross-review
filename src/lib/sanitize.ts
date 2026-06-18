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

export function isValidMarkdownReport(filename: string, content: string): boolean {
  if (!filename.toLowerCase().endsWith(".md")) return false;
  
  // 1. New official software signature
  if (content.includes("review-weaver-signature")) return true;
  
  // 2. Legacy exports (e.g. from sample-export)
  if (content.includes("## 1.") || filename.toLowerCase().includes("review-for")) return true;
  
  // 3. Basic check to ensure it is a clean text document, not binary garbage
  const isBinary = /[\x00-\x08\x0E-\x1F\x7F\xFF]/.test(content.slice(0, 1000));
  if (isBinary) return false;
  
  // Must contain some basic Markdown structure
  const hasMarkdownStructure = /#+\s|\n-\s|\n\*\s|\n\d+\.\s|\*\*|\[.*\]\(.*\)/.test(content);
  if (hasMarkdownStructure) return true;
  
  return false;
}
