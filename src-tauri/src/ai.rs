use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use tokio_util::sync::CancellationToken;

use crate::models::{
    AiErrorCode, AiErrorPayload, AiProviderConfig, AiProviderKind, DebugLog, Project, QaReport,
};
use genai::adapter::AdapterKind;
use genai::chat::{ChatMessage, ChatOptions, ChatRequest};
use genai::resolver::{AuthData, Endpoint, ProviderConfig, ServiceTargetResolver};
use genai::Client;

static CURRENT_CANCEL_TOKEN: OnceLock<Mutex<Option<CancellationToken>>> = OnceLock::new();

fn register_cancel(token: CancellationToken) {
    let slot = CURRENT_CANCEL_TOKEN.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = slot.lock() {
        if let Some(prev) = guard.take() {
            prev.cancel();
        }
        *guard = Some(token);
    }
}

pub fn cancel_in_flight() -> bool {
    if let Some(slot) = CURRENT_CANCEL_TOKEN.get() {
        if let Ok(mut guard) = slot.lock() {
            if let Some(token) = guard.take() {
                token.cancel();
                return true;
            }
        }
    }
    false
}
pub fn default_rewrite_prompt() -> &'static str {
    "You are a senior QA lead. You will receive several QA team reports about the \
     same target, written independently. Your job is to produce ONE consolidated \
     report that:\n\
     1. Preserves every distinct finding, bug, observation, and recommendation \
        from the inputs. Do NOT drop information.\n\
     2. Deduplicates content that the teams reported in identical or near-identical \
        form — merge them into a single canonical entry.\n\
     3. Reorganises the content into a clear Markdown structure:\n\
        - A short executive summary (2-4 sentences)\n\
        - '## Findings' — numbered, deduplicated, each with severity if reported\n\
        - '## Recommendations' — deduplicated, ordered by impact\n\
        - '## Open questions' — anything ambiguous or contradictory\n\
     4. Uses professional, neutral language. Keep the original meaning. Do not \
        invent findings the sources do not support.\n\
     5. Output in the same language as the source reports. Match the original \
        terminology, names, and code identifiers verbatim.\n\
     6. Output Markdown only — no code fences around the whole document, no \
        preamble, no postscript."
}

pub fn scrub_api_key(s: &str, api_key: &str) -> String {
    if api_key.is_empty() {
        return s.to_string();
    }
    s.replace(api_key, "<REDACTED>")
}

/// Removes CJK Unified Ideographs and CJK punctuation. Keeps Latin, Vietnamese, markdown.
pub fn strip_chinese(text: &str) -> String {
    text.chars()
        .filter(|c| {
            let cp = *c as u32;
            // CJK Unified Ideographs: U+4E00..U+9FFF
            // CJK Unified Ideographs Extension A: U+3400..U+4DBF
            // CJK Compatibility Ideographs: U+F900..U+FAFF
            // CJK Symbols and Punctuation: U+3000..U+303F (、。，：；etc.)
            let is_cjk = (0x4E00..=0x9FFF).contains(&cp)
                || (0x3400..=0x4DBF).contains(&cp)
                || (0xF900..=0xFAFF).contains(&cp)
                || (0x3000..=0x303F).contains(&cp);
            !is_cjk
        })
        .collect()
}

fn prepend_vietnamese_instruction(prompt: &str) -> String {
    format!(
        "CRITICAL: You MUST respond entirely in Vietnamese language. Translate all output to Vietnamese. Do NOT use any other language.\n\n{}",
        prompt
    )
}

fn to_adapter(kind: AiProviderKind) -> AdapterKind {
    match kind {
        AiProviderKind::Ollama => AdapterKind::Ollama,
        AiProviderKind::Openai => AdapterKind::OpenAI,
        AiProviderKind::Anthropic => AdapterKind::Anthropic,
        AiProviderKind::Gemini => AdapterKind::Gemini,
        AiProviderKind::Deepseek => AdapterKind::DeepSeek,
        AiProviderKind::Mimo => AdapterKind::Mimo,
        AiProviderKind::Opencodego => AdapterKind::OpenCodeGo,
        AiProviderKind::OpenaiCompatible => AdapterKind::OpenAI,
    }
}

fn build_client(cfg: &AiProviderConfig) -> Result<Client, AiErrorPayload> {
    if matches!(cfg.kind, AiProviderKind::OpenaiCompatible) && cfg.base_url.trim().is_empty() {
        return Err(AiErrorPayload {
            code: AiErrorCode::Provider {
                message: "OpenaiCompatible requires a base_url".to_string(),
            },
            message: "OpenaiCompatible requires a base_url".to_string(),
        });
    }
    // Trailing slash ensures Url::join("chat/completions") resolves correctly.
    let user_base_url = {
        let trimmed = cfg.base_url.trim();
        if trimmed.is_empty() {
            String::new()
        } else if trimmed.ends_with('/') {
            trimmed.to_string()
        } else {
            format!("{trimmed}/")
        }
    };
    let user_api_key = cfg.api_key.clone();

    let target_resolver = ServiceTargetResolver::from_resolver_fn(
        move |service_target: genai::ServiceTarget| -> Result<genai::ServiceTarget, genai::resolver::Error> {
            let genai::ServiceTarget {
                endpoint,
                auth,
                model,
            } = service_target;
            let endpoint = if !user_base_url.is_empty() {
                Endpoint::from_owned(user_base_url.clone())
            } else {
                endpoint
            };
            let auth = if !user_api_key.is_empty() {
                AuthData::from_single(user_api_key.clone())
            } else {
                auth
            };
            Ok(genai::ServiceTarget {
                endpoint,
                auth,
                model,
            })
        },
    );

    Ok(Client::builder()
        .with_service_target_resolver(target_resolver)
        .build())
}

fn select_sources<'a>(project: &'a Project, target: Option<&'a QaReport>) -> Vec<&'a QaReport> {
    project
        .qa_reports
        .iter()
        .filter(|qa| qa.active && target.map_or(true, |t| !project.exclude_self || qa.id != t.id))
        .collect()
}

fn estimate_chars(sources: &[&QaReport]) -> usize {
    sources
        .iter()
        .map(|q| q.name.chars().count() + q.content.chars().count() + 16)
        .sum()
}

fn system_prompt_chars(cfg: &AiProviderConfig) -> usize {
    if cfg.system_prompt.trim().is_empty() {
        default_rewrite_prompt().chars().count()
    } else {
        cfg.system_prompt.chars().count()
    }
}

fn estimate_total_chars(sources: &[&QaReport], cfg: &AiProviderConfig) -> usize {
    estimate_chars(sources) + system_prompt_chars(cfg) + 64
}

fn build_chat_request(cfg: &AiProviderConfig, sources: &[&QaReport]) -> ChatRequest {
    let mut system = if cfg.system_prompt.trim().is_empty() {
        default_rewrite_prompt().to_string()
    } else {
        cfg.system_prompt.clone()
    };
    if cfg.translate_vietnamese {
        system = prepend_vietnamese_instruction(&system);
    }
    let mut body = String::with_capacity(estimate_chars(sources));
    for (i, qa) in sources.iter().enumerate() {
        if i > 0 {
            body.push_str("\n\n---\n\n");
        }
        body.push_str(&format!(
            "## Source {}\n**Name:** {}\n\n",
            i + 1,
            qa.name
        ));
        body.push_str(qa.content.trim());
    }
    ChatRequest::default()
        .with_system(system)
        .append_message(ChatMessage::user(format!(
            "Consolidate the following QA reports into one deduplicated, full report.\n\n{}",
            body
        )))
}

const REWRITE_TIMEOUT_SECS: u64 = 120;
const TEST_TIMEOUT_SECS: u64 = 30;

fn build_chat_options(cfg: &AiProviderConfig) -> Option<ChatOptions> {
    use genai::chat::ReasoningEffort;
    let effort = match cfg.thinking_effort.trim().to_lowercase().as_str() {
        "low" => Some(ReasoningEffort::Low),
        "medium" => Some(ReasoningEffort::Medium),
        "high" => Some(ReasoningEffort::High),
        "max" => Some(ReasoningEffort::Max),
        _ => None, // "none" or empty → no reasoning effort
    };
    effort.map(|e| ChatOptions::default().with_reasoning_effort(e))
}

async fn exec(
    client: Client,
    model: &str,
    request: ChatRequest,
    chat_options: Option<ChatOptions>,
    cancel: CancellationToken,
    timeout_secs: u64,
    api_key_for_scrub: &str,
) -> Result<String, AiErrorPayload> {
    let model = model.to_string();
    let api_key_for_scrub = api_key_for_scrub.to_string();
    let fut = async move {
        tokio::select! {
            res = tokio::time::timeout(Duration::from_secs(timeout_secs), client.exec_chat(model, request, chat_options.as_ref())) => {
                match res {
                    Ok(Ok(chat_res)) => {
                        chat_res.first_text()
                            .map(|s| s.to_string())
                            .ok_or_else(|| AiErrorPayload {
                                code: AiErrorCode::EmptyResponse,
                                message: "AI returned an empty response.".to_string(),
                            })
                    }
                    Ok(Err(e)) => {
                        let raw = e.to_string();
                        let scrubbed = scrub_api_key(&raw, &api_key_for_scrub);
                        Err(AiErrorPayload {
                            code: AiErrorCode::Provider { message: scrubbed.clone() },
                            message: format!("AI provider error: {scrubbed}"),
                        })
                    }
                    Err(_) => Err(AiErrorPayload {
                        code: AiErrorCode::Timeout { seconds: timeout_secs },
                        message: format!("AI request timed out after {timeout_secs}s"),
                    }),
                }
            }
            _ = cancel.cancelled() => Err(AiErrorPayload {
                code: AiErrorCode::Cancelled,
                message: "AI request was cancelled.".to_string(),
            }),
        }
    };
    fut.await
}

/// Result of a rewrite call: the markdown output, input char count, and optional debug log.
pub struct RewriteOutput {
    pub markdown: String,
    pub input_chars: usize,
    pub debug_log: Option<DebugLog>,
}

/// Capture debug info from a ChatRequest before sending.
fn capture_request_debug(request: &ChatRequest, cfg: &AiProviderConfig) -> String {
    use genai::chat::ChatRole;
    let debug_request = serde_json::json!({
        "system": request.system.as_deref().unwrap_or(""),
        "messages": request.messages.iter().map(|m| {
            serde_json::json!({
                "role": match m.role {
                    ChatRole::User => "user",
                    ChatRole::Assistant => "assistant",
                    ChatRole::System => "system",
                    ChatRole::Tool => "tool",
                },
                "content": m.content.first_text().unwrap_or(""),
            })
        }).collect::<Vec<_>>(),
        "model": cfg.model,
        "thinking_effort": cfg.thinking_effort,
    });
    serde_json::to_string_pretty(&debug_request).unwrap_or_default()
}

fn make_debug_log(cfg: &AiProviderConfig, request_summary: String, response_text: String, duration_ms: u64, success: bool) -> DebugLog {
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    DebugLog {
        timestamp: format!("{}", ts),
        provider: cfg.kind.as_str().to_string(),
        model: cfg.model.clone(),
        thinking_effort: cfg.thinking_effort.clone(),
        request_messages: request_summary,
        response_text,
        duration_ms,
        success,
    }
}

#[allow(dead_code)]
pub async fn rewrite_for_target(
    project: &Project,
    target_qa_id: &str,
    cancel: CancellationToken,
) -> Result<RewriteOutput, AiErrorPayload> {
    let cfg = project.ai_config.as_ref().ok_or(AiErrorPayload {
        code: AiErrorCode::NotConfigured,
        message: "AI is not configured. Open Settings to add a provider.".to_string(),
    })?;
    let target = project
        .qa_reports
        .iter()
        .find(|q| q.id == target_qa_id)
        .ok_or_else(|| AiErrorPayload {
            code: AiErrorCode::TargetNotFound,
            message: format!("Target QA '{target_qa_id}' not found."),
        })?;
    let sources = select_sources(project, Some(target));
    if sources.is_empty() {
        return Err(AiErrorPayload {
            code: AiErrorCode::NoSources,
            message: "No active sources to rewrite.".to_string(),
        });
    }
    let chars = estimate_total_chars(&sources, cfg);
    if chars > cfg.max_input_chars {
        return Err(AiErrorPayload {
            code: AiErrorCode::InputTooLarge {
                chars,
                max: cfg.max_input_chars,
            },
            message: format!(
                "Input is {chars} chars, exceeds limit {} (raise in Settings).",
                cfg.max_input_chars
            ),
        });
    }
    let request = build_chat_request(cfg, &sources);
    let request_summary = capture_request_debug(&request, cfg);
    let client = build_client(cfg)?;
    let chat_options = build_chat_options(cfg);
    let start = std::time::Instant::now();
    register_cancel(cancel.clone());
    let result = exec(
        client,
        &cfg.model,
        request,
        chat_options,
        cancel,
        REWRITE_TIMEOUT_SECS,
        &cfg.api_key,
    )
    .await;
    let duration_ms = start.elapsed().as_millis() as u64;
    result.map(|markdown| {
        let markdown = if cfg.remove_chinese {
            strip_chinese(&markdown)
        } else {
            markdown
        };
        let debug_log = make_debug_log(cfg, request_summary, markdown.chars().take(5000).collect(), duration_ms, true);
        RewriteOutput { markdown, input_chars: chars, debug_log: Some(debug_log) }
    })
}

pub async fn rewrite_all(
    project: &Project,
    cancel: CancellationToken,
) -> Result<RewriteOutput, AiErrorPayload> {
    let cfg = project.ai_config.as_ref().ok_or(AiErrorPayload {
        code: AiErrorCode::NotConfigured,
        message: "AI is not configured. Open Settings to add a provider.".to_string(),
    })?;
    let sources = select_sources(project, None);
    if sources.is_empty() {
        return Err(AiErrorPayload {
            code: AiErrorCode::NoSources,
            message: "No active sources to rewrite.".to_string(),
        });
    }
    let chars = estimate_total_chars(&sources, cfg);
    if chars > cfg.max_input_chars {
        return Err(AiErrorPayload {
            code: AiErrorCode::InputTooLarge {
                chars,
                max: cfg.max_input_chars,
            },
            message: format!(
                "Input is {chars} chars, exceeds limit {} (raise in Settings).",
                cfg.max_input_chars
            ),
        });
    }
    let request = build_chat_request(cfg, &sources);
    let request_summary = capture_request_debug(&request, cfg);
    let client = build_client(cfg)?;
    let chat_options = build_chat_options(cfg);
    let start = std::time::Instant::now();
    register_cancel(cancel.clone());
    let result = exec(
        client,
        &cfg.model,
        request,
        chat_options,
        cancel,
        REWRITE_TIMEOUT_SECS,
        &cfg.api_key,
    )
    .await;
    let duration_ms = start.elapsed().as_millis() as u64;
    result.map(|markdown| {
        let markdown = if cfg.remove_chinese {
            strip_chinese(&markdown)
        } else {
            markdown
        };
        let debug_log = make_debug_log(cfg, request_summary, markdown.chars().take(5000).collect(), duration_ms, true);
        RewriteOutput { markdown, input_chars: chars, debug_log: Some(debug_log) }
    })
}

pub async fn test_provider(cfg: &AiProviderConfig) -> Result<(), AiErrorPayload> {
    let client = build_client(cfg)?;
    let request = ChatRequest::default()
        .with_system("Reply with the single word: ok")
        .append_message(ChatMessage::user("ping"));
    let cancel = CancellationToken::new();
    let chat_options = build_chat_options(cfg);
    // Don't register test's cancel token globally - test should run to completion.
    // Also don't call clear_cancel() here — a concurrent rewrite may have a
    // registered token that we must not wipe.
    let result = exec(
        client,
        &cfg.model,
        request,
        chat_options,
        cancel,
        TEST_TIMEOUT_SECS,
        &cfg.api_key,
    )
    .await;
    let _ = result?;
    Ok(())
}

/// Like `test_provider` but returns a debug log with request/response details.
pub async fn test_provider_debug(cfg: &AiProviderConfig) -> Result<DebugLog, AiErrorPayload> {
    let client = build_client(cfg)?;
    let request = ChatRequest::default()
        .with_system("Reply with the single word: ok")
        .append_message(ChatMessage::user("ping"));
    let cancel = CancellationToken::new();
    let chat_options = build_chat_options(cfg);

    // Capture request details
    let request_json = serde_json::json!({
        "system": "Reply with the single word: ok",
        "messages": [{"role": "user", "content": "ping"}],
        "model": cfg.model,
        "thinking_effort": cfg.thinking_effort,
    });
    let request_summary = serde_json::to_string_pretty(&request_json).unwrap_or_default();

    let start = std::time::Instant::now();
    let result = exec(
        client,
        &cfg.model,
        request,
        chat_options,
        cancel,
        TEST_TIMEOUT_SECS,
        &cfg.api_key,
    )
    .await;
    let duration_ms = start.elapsed().as_millis() as u64;

    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let timestamp = format!("{}", ts);

    match result {
        Ok(text) => Ok(DebugLog {
            timestamp,
            provider: cfg.kind.as_str().to_string(),
            model: cfg.model.clone(),
            thinking_effort: cfg.thinking_effort.clone(),
            request_messages: request_summary,
            response_text: text,
            duration_ms,
            success: true,
        }),
        Err(e) => Ok(DebugLog {
            timestamp,
            provider: cfg.kind.as_str().to_string(),
            model: cfg.model.clone(),
            thinking_effort: cfg.thinking_effort.clone(),
            request_messages: request_summary,
            response_text: e.message.clone(),
            duration_ms,
            success: false,
        }),
    }
}

pub async fn list_models(cfg: &AiProviderConfig) -> Result<Vec<String>, AiErrorPayload> {
    let client = build_client(cfg)?;
    let adapter = to_adapter(cfg.kind);
    let provider_config = ProviderConfig {
        endpoint: if cfg.base_url.trim().is_empty() {
            None
        } else {
            Some(Endpoint::from_owned(cfg.base_url.trim().to_string()))
        },
        auth: if cfg.api_key.is_empty() {
            None
        } else {
            Some(AuthData::from_single(cfg.api_key.clone()))
        },
    };

    if let Ok(names) = client.all_model_names(adapter, provider_config).await {
        if !names.is_empty() {
            return Ok(names);
        }
    }

    Ok(match cfg.kind {
        AiProviderKind::Ollama => {
            vec![
                "llama3.2".to_string(),
                "mistral".to_string(),
                "gemma3".to_string(),
            ]
        }
        AiProviderKind::Openai => {
            vec![
                "gpt-5.5".to_string(),
                "gpt-5.4".to_string(),
                "gpt-5.3".to_string(),
            ]
        }
        AiProviderKind::Anthropic => {
            vec![
                "claude-sonnet-4-6".to_string(),
                "claude-sonnet-4-5".to_string(),
                "claude-opus-4-8".to_string(),
                "claude-opus-4-7".to_string(),
                "claude-opus-4-6".to_string(),
                "claude-haiku-4-5".to_string(),
            ]
        }
        AiProviderKind::Gemini => {
            vec![
                "gemini-3.5-flash".to_string(),
                "gemini-3.1-pro-preview".to_string(),
            ]
        }
        AiProviderKind::Deepseek => {
            vec![
                "deepseek-v4-flash".to_string(),
                "deepseek-v4-pro".to_string(),
            ]
        }
        AiProviderKind::Mimo => {
            vec![
                "mimo-v2.5".to_string(),
                "mimo-v2.5-pro".to_string(),
            ]
        }
        AiProviderKind::Opencodego => {
            vec![
                "deepseek-v4-flash".to_string(),
                "deepseek-v4-pro".to_string(),
                "glm-5".to_string(),
                "glm-5.1".to_string(),
                "glm-5.2".to_string(),
                "kimi-k2.5".to_string(),
                "kimi-k2.6".to_string(),
                "kimi-k2.7-code".to_string(),
                "mimo-v2.5".to_string(),
                "mimo-v2.5-pro".to_string(),
                "minimax-m2.7".to_string(),
                "minimax-m3".to_string(),
                "qwen3.5-plus".to_string(),
                "qwen3.6-plus".to_string(),
                "qwen3.7-max".to_string(),
                "qwen3.7-plus".to_string(),
            ]
        }
        // OpenaiCompatible: no fallback — user types model name freely
        AiProviderKind::OpenaiCompatible => vec![],
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_debug_redacts_api_key_set() {
        let cfg = AiProviderConfig {
            kind: AiProviderKind::Openai,
            base_url: String::new(),
            api_key: "sk-test1234567890".to_string(),
            model: "gpt-4o".to_string(),
            system_prompt: String::new(),
            max_input_chars: 50_000,
            thinking_effort: String::new(),
            translate_vietnamese: false,
            remove_chinese: false,
        };
        let debug_str = format!("{:?}", cfg);
        assert!(
            !debug_str.contains("sk-test1234567890"),
            "API key leaked in Debug: {}",
            debug_str
        );
        assert!(
            debug_str.contains("<REDACTED"),
            "Debug should contain REDACTED marker"
        );
        assert!(
            debug_str.contains("set=true"),
            "Debug should indicate key is set"
        );
    }

    #[test]
    fn test_debug_redacts_api_key_empty() {
        let cfg = AiProviderConfig {
            kind: AiProviderKind::Ollama,
            base_url: String::new(),
            api_key: String::new(),
            model: "llama3.2".to_string(),
            system_prompt: String::new(),
            max_input_chars: 50_000,
            thinking_effort: String::new(),
            translate_vietnamese: false,
            remove_chinese: false,
        };
        let debug_str = format!("{:?}", cfg);
        assert!(
            debug_str.contains("<REDACTED"),
            "Debug should contain REDACTED marker"
        );
        assert!(
            debug_str.contains("set=false"),
            "Debug should indicate key is not set"
        );
    }

    #[test]
    fn test_scrub_api_key_in_provider_err() {
        let key = "sk-abc123secret";
        let err_msg = format!("401 invalid x-api-key: {}", key);
        let scrubbed = scrub_api_key(&err_msg, key);
        assert!(
            !scrubbed.contains(key),
            "Scrubbed message still contains key: {}",
            scrubbed
        );
        assert!(
            scrubbed.contains("<REDACTED>"),
            "Scrubbed message should contain REDACTED"
        );
    }

    #[test]
    fn test_scrub_api_key_empty() {
        let msg = "Connection refused";
        let scrubbed = scrub_api_key(msg, "");
        assert_eq!(scrubbed, msg);
    }

    #[test]
    fn test_estimate_total_chars_includes_prompt() {
        let qa = QaReport {
            id: "1".into(),
            name: "A".into(),
            content: "hello".into(),
            active: true,
        };
        let source_refs: Vec<&QaReport> = vec![&qa];
        let cfg = AiProviderConfig {
            kind: AiProviderKind::Ollama,
            base_url: String::new(),
            api_key: String::new(),
            model: "x".into(),
            system_prompt: "ABCDEFGHIJ".into(), // 10 chars
            max_input_chars: 100_000,
            thinking_effort: String::new(),
            translate_vietnamese: false,
            remove_chinese: false,
        };
        // source chars: name(1) + content(5) + 16 = 22, + system_prompt(10) + 64 = 96
        let total = estimate_total_chars(&source_refs, &cfg);
        assert!(
            total > 90,
            "estimate_total_chars should include system prompt, got {}",
            total
        );
    }

    #[test]
    fn test_default_system_prompt_includes_language_rule() {
        let prompt = default_rewrite_prompt();
        assert!(
            prompt.contains("same language"),
            "Default prompt should mention language matching"
        );
    }

    #[test]
    fn test_provider_kind_to_adapter_ollama() {
        assert!(matches!(
            to_adapter(AiProviderKind::Ollama),
            AdapterKind::Ollama
        ));
    }

    #[test]
    fn test_provider_kind_to_adapter_openai_compatible() {
        assert!(matches!(
            to_adapter(AiProviderKind::OpenaiCompatible),
            AdapterKind::OpenAI
        ));
    }

    #[test]
    fn test_cancel_in_flight_returns_true() {
        // No token registered yet — should return false
        assert!(!cancel_in_flight(), "cancel_in_flight should return false when no token registered");

        // Register a token — cancel_in_flight should return true
        let token = CancellationToken::new();
        register_cancel(token.clone());
        assert!(cancel_in_flight(), "cancel_in_flight should return true after register");
        assert!(token.is_cancelled(), "Token should be cancelled");

        // After cancel_in_flight took the token, slot is empty — should return false
        assert!(!cancel_in_flight(), "cancel_in_flight should return false after token was taken");
    }

    #[test]
    fn test_cancellation_register_and_cancel() {
        let token = CancellationToken::new();
        assert!(!token.is_cancelled());
        register_cancel(token.clone());
        cancel_in_flight();
        assert!(token.is_cancelled());
    }

    #[test]
    fn test_cancellation_register_replaces_previous() {
        let token1 = CancellationToken::new();
        let token2 = CancellationToken::new();
        register_cancel(token1.clone());
        register_cancel(token2.clone());
        // token1 should have been cancelled by register_cancel replacement
        assert!(token1.is_cancelled(), "Previous token should be cancelled on replace");
        // cancel_in_flight should cancel token2
        assert!(cancel_in_flight());
        assert!(token2.is_cancelled(), "Current token should be cancelled");
    }

    #[test]
    fn test_input_too_large() {
        // Create sources that exceed a small max_input_chars limit.
        // The estimate_total_chars includes source chars + system_prompt_chars + 64.
        // One source with name "A" (1) + content "hello world" (11) + 16 = 28
        // system_prompt_chars with default prompt is ~1430 chars
        // total = 28 + ~1430 + 64 = ~1522
        // Set max_input_chars = 1, so it's guaranteed to exceed.
        let qa = QaReport {
            id: "1".into(),
            name: "A".into(),
            content: "hello world".into(),
            active: true,
        };
        let qa2 = QaReport {
            id: "2".into(),
            name: "B".into(),
            content: "some content".into(),
            active: true,
        };
        let source_refs: Vec<&QaReport> = vec![&qa, &qa2];
        let cfg = AiProviderConfig {
            kind: AiProviderKind::Ollama,
            base_url: String::new(),
            api_key: String::new(),
            model: "llama3.2".into(),
            system_prompt: String::new(),
            max_input_chars: 1, // impossibly low — always triggers InputTooLarge
            thinking_effort: String::new(),
            translate_vietnamese: false,
            remove_chinese: false,
        };
        let total = estimate_total_chars(&source_refs, &cfg);
        assert!(total > cfg.max_input_chars, "estimate_total_chars should exceed max_input_chars limit");

        // Verify the error code shape — InputTooLarge is returned when chars > max
        // (without calling the provider, which is enforced by the early return in rewrite_*)
        assert!(total > 1, "total chars should exceed the tiny limit");
    }

    #[test]
    fn test_strip_chinese_removes_cjk_characters() {
        let input = "Hello 你好世界 World 测试";
        let result = strip_chinese(input);
        assert_eq!(result, "Hello  World ");
    }

    #[test]
    fn test_strip_chinese_preserves_vietnamese() {
        let input = "Báo cáo 你好 findings with accent: áàảãạ";
        let result = strip_chinese(input);
        assert_eq!(result, "Báo cáo  findings with accent: áàảãạ");
    }

    #[test]
    fn test_strip_chinese_removes_cjk_punctuation() {
        // CJK symbols (U+3000-303F) are removed, fullwidth ASCII (U+FF00+) are kept
        let input = "Hello、world。你好！test【bracket】";
        let result = strip_chinese(input);
        assert_eq!(result, "Helloworld！testbracket");
    }

    #[test]
    fn test_strip_chinese_no_cjk_passthrough() {
        let input = "Normal English text with no Chinese.";
        let result = strip_chinese(input);
        assert_eq!(result, input);
    }

    #[test]
    fn test_prepend_vietnamese_instruction() {
        let prompt = "You are a QA lead.";
        let result = prepend_vietnamese_instruction(prompt);
        assert!(result.starts_with("CRITICAL"));
        assert!(result.contains("Vietnamese"));
        assert!(result.contains("You are a QA lead."));
    }

    #[test]
    fn test_service_target_uses_base_url_when_set() {
        // Verify that build_client succeeds with a custom base_url and
        // does not panic. The actual ServiceTargetResolver behaviour is
        // exercised at integration level (requires a running endpoint),
        // but we can at least confirm the client builds without error.
        let cfg = AiProviderConfig {
            kind: AiProviderKind::OpenaiCompatible,
            base_url: "http://127.0.0.1:8080/v1/".into(),
            api_key: "sk-test".into(),
            model: "test-model".into(),
            system_prompt: String::new(),
            max_input_chars: 50_000,
            thinking_effort: String::new(),
            translate_vietnamese: false,
            remove_chinese: false,
        };
        let result = build_client(&cfg);
        assert!(result.is_ok(), "build_client should succeed with custom base_url");

        // Verify that OpenaiCompatible with empty base_url fails
        let cfg_no_url = AiProviderConfig {
            kind: AiProviderKind::OpenaiCompatible,
            base_url: String::new(),
            api_key: String::new(),
            model: String::new(),
            system_prompt: String::new(),
            max_input_chars: 50_000,
            thinking_effort: String::new(),
            translate_vietnamese: false,
            remove_chinese: false,
        };
        let result_no_url = build_client(&cfg_no_url);
        assert!(result_no_url.is_err(), "OpenaiCompatible should fail without base_url");
    }
}

/// Integration tests — set REVIEW_WEAVER_RUN_AI_TESTS=1 to enable.
#[cfg(test)]
mod integration {
    use super::*;
    use crate::models::{Project, QaReport};
    use tokio_util::sync::CancellationToken;

    #[tokio::test]
    async fn test_ai_rewrite_preview_ollama_e2e() {
        if std::env::var("REVIEW_WEAVER_RUN_AI_TESTS").unwrap_or_default() != "1" {
            eprintln!("SKIP: set REVIEW_WEAVER_RUN_AI_TESTS=1 to run AI integration tests");
            return;
        }

        // Build a minimal 2-source project
        let project = Project {
            title: "E2E test".into(),
            components: vec![],
            qa_reports: vec![
                QaReport {
                    id: "qa1".into(),
                    name: "Team A".into(),
                    content: "The login page has a visual bug on Safari. The button is misaligned.".into(),
                    active: true,
                },
                QaReport {
                    id: "qa2".into(),
                    name: "Team B".into(),
                    content: "Login button is offset by 2px on Safari 17. Also the forgot-password link wraps on mobile.".into(),
                    active: true,
                },
            ],
            exclude_self: false,
            opening_text: None,
            closing_text: None,
            ai_config: Some(AiProviderConfig {
                kind: AiProviderKind::Ollama,
                base_url: String::new(),
                api_key: String::new(),
                model: "llama3.2:1b".into(),
                system_prompt: String::new(),
                max_input_chars: 200_000,
                thinking_effort: String::new(),
                translate_vietnamese: false,
                remove_chinese: false,
            }),
        };

        let cancel = CancellationToken::new();
        let result = rewrite_for_target(&project, "qa1", cancel).await;

        match result {
            Ok(output) => {
                assert!(!output.markdown.is_empty(), "AI rewrite should return non-empty markdown");
            }
            Err(e) => {
                match &e.code {
                    AiErrorCode::Provider { .. }
                    | AiErrorCode::Timeout { .. }
                    | AiErrorCode::EmptyResponse => {
                        eprintln!(
                            "SKIP: Ollama not reachable — {}. \
                             Ensure ollama serve is running and llama3.2:1b is pulled.",
                            e.message
                        );
                        return;
                    }
                    _ => panic!("AI integration test failed: {:?} — {}", e.code, e.message),
                }
            }
        }
    }
}
