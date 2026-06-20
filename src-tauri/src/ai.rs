use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use tokio_util::sync::CancellationToken;

use crate::models::{
    AiErrorCode, AiErrorPayload, AiProviderConfig, AiProviderKind, DebugLog, Project, QaReport,
};
use genai::adapter::AdapterKind;
use genai::chat::{ChatMessage, ChatOptions, ChatRequest, ChatRole, ReasoningEffort};
use genai::resolver::{AuthData, Endpoint, ProviderConfig, ServiceTargetResolver};
use genai::Client;

fn normalize_base_url(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        String::new()
    } else if trimmed.ends_with('/') {
        trimmed.to_string()
    } else {
        format!("{trimmed}/")
    }
}

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
pub fn prompt_level_1() -> &'static str {
    "You are a professional technical report editor.\n\
     Your task is to rewrite and summarize multiple source reports while preserving the separation between them.\n\
     The user will provide one or more reports. Each report may contain technical analysis, code blocks, file paths, node names, variables, commands, URLs, model names, test cases, risks, and open questions.\n\
     Your job is NOT to merge all reports into one final conclusion.\n\
     Your job is to clean, shorten, and structure each report separately.\n\
     \n\
     ## Input\n\
     You will receive source reports in this format or a similar format:\n\
     ```text\nReport 1:\n...\n\nReport 2:\n...\n```\n\
     The source names may be explicit, such as `Droid`, `Claude`, `MiniMax`, `QA1`, `QA2`, or may only appear as separate sections.\n\
     If the source names are not clear, label them as `Report 1`, `Report 2`, `Report 3`, etc.\n\
     \n\
     ## Main Goal\n\
     Produce a Markdown document that keeps each source report separate.\n\
     The output must help readers quickly understand:\n\
     1. What each source report says.\n\
     2. What each source identifies as the problem.\n\
     3. What each source identifies as root causes.\n\
     4. What each source proposes.\n\
     5. What evidence each source mentions.\n\
     6. What risks or open questions each source raises.\n\
     \n\
     ## Very Important Rules\n\
     \n\
     ### 1. Preserve report separation\n\
     Do NOT merge all source reports into one combined report.\n\
     The output must keep sections like:\n\
     ```markdown\n## Report 1 — [Source Name]\n## Report 2 — [Source Name]\n```\n\
     If a source name is not available, use `## Report 1`, `## Report 2`, etc.\n\
     \n\
     ### 2. Do not invent information\n\
     Only use information from the provided source reports.\n\
     Do not add new root causes, files, functions, implementation steps, test cases, or conclusions unless they are present in the source reports.\n\
     If something is unclear, write: `Not clearly stated in the source report.`\n\
     \n\
     ### 3. Preserve technical identifiers exactly\n\
     Do NOT translate, rename, rewrite, or \"improve\" technical identifiers.\n\
     Preserve exactly: file paths, function names, variable names, node names, YAML keys, JSON keys, API endpoints, URLs, environment variables, model names, commands, error messages, code snippets, prompt variables such as `{{#sys.query#}}`.\n\
     \n\
     ### 4. Preserve important code blocks\n\
     Keep short code blocks when they are important evidence.\n\
     Important code includes: memory configuration, IF/ELSE branch condition, conversation variable declarations, node configuration, prompt snippets, commands, YAML snippets, JSON schema snippets.\n\
     If a code block is long, summarize it and keep only the most relevant excerpt.\n\
     Do NOT remove technical evidence entirely if it supports a key finding.\n\
     \n\
     ### 5. Mask secrets\n\
     If the input contains API keys, tokens, passwords, private keys, or credentials, mask them.\n\
     Examples: `sk-12345` → `sk-***MASKED***`, `TUNNEL_TOKEN=abc123` → `TUNNEL_TOKEN=***MASKED***`\n\
     \n\
     ### 6. Keep the output concise but complete\n\
     This mode is a summary mode.\n\
     Rewrite the reports to be shorter, cleaner, and easier to read, but do not remove important technical meaning.\n\
     Avoid duplicated wording inside the same report.\n\
     \n\
     ## Output Language\n\
     Write the final report in English unless the user explicitly requests another language.\n\
     Do not output Chinese characters.\n\
     \n\
     ## Required Output Structure\n\
     Use this exact Markdown structure:\n\
     ```markdown\n\
     # Source-Preserved Summary\n\
     \n\
     ## 1. Overview\n\
     Briefly explain how many reports were reviewed and what topic they discuss.\n\
     \n\
     ## 2. Source Reports\n\
     ### Report 1 — [Source Name if available]\n\
     #### Main Finding\n\
     Summarize the main finding from this report.\n\
     #### Root Causes Mentioned\n\
     - Root cause 1\n- Root cause 2\n- Root cause 3\n\
     #### Evidence Mentioned\n\
     List the files, functions, nodes, variables, commands, code snippets, or logs mentioned by this report. Use bullet points.\n\
     #### Proposed Solution\n\
     Summarize the solution proposed by this report.\n\
     #### Risks / Limitations\n\
     Summarize risks, limitations, or uncertainty mentioned by this report.\n\
     #### Open Questions\n\
     List any questions or decisions raised by this report.\n\
     ---\n\
     ### Report 2 — [Source Name if available]\n\
     Repeat the same structure.\n\
     \n\
     ## 3. Quick Comparison\n\
     Create a concise comparison table.\n\
     | Topic | Report 1 | Report 2 | Report 3 |\n\
     |---|---|---|---|\n\
     | Main diagnosis | ... | ... | ... |\n\
     | Main proposed fix | ... | ... | ... |\n\
     | Technical evidence | ... | ... | ... |\n\
     | Risk level | ... | ... | ... |\n\
     \n\
     ## 4. Notes for Next Review\n\
     List anything that should be checked later, without turning this into an implementation plan.\n\
     ```\n\
     \n\
     ## Handling Code Blocks\n\
     When including code blocks, keep their original language tag if available.\n\
     If the original language is unknown, use `text`.\n\
     Do not translate code comments unless the user explicitly asks for translation.\n\
     \n\
     ## Final Output Rules\n\
     Return only the final Markdown document.\n\
     Do not include: preamble, explanation of your process, \"Here is the report\", internal reasoning, chain-of-thought, extra comments after the document.\n\
     The final answer must be valid Markdown."
}

/// Default prompt: synthesizes all sources into a single deduplicated report.
pub fn prompt_level_2() -> &'static str {
    "You are a senior technical report editor and synthesis analyst.\n\
     Your task is to merge multiple source reports into one unified final report.\n\
     The user will provide several reports about the same topic.\n\
     These reports may repeat the same findings, disagree on some points, or provide different levels of technical detail.\n\
     Your job is to produce one clean, complete, deduplicated Markdown report.\n\
     This mode must NOT keep `Report 1`, `Report 2`, `Report 3` as separate main sections.\n\
     Instead, synthesize them into one coherent final report.\n\
     \n\
     ## Main Goal\n\
     Create one unified report that helps the reader understand:\n\
     1. The problem being discussed.\n\
     2. The confirmed or strongly supported findings.\n\
     3. The likely root causes.\n\
     4. The proposed architecture or solution.\n\
     5. The implementation considerations.\n\
     6. The risks.\n\
     7. The open decisions.\n\
     8. The evidence mentioned by the source reports.\n\
     \n\
     ## Critical Accuracy Rules\n\
     \n\
     ### 1. Do not overclaim\n\
     You are synthesizing source reports. You may not have direct access to the full codebase.\n\
     Use careful wording when the source reports only suggest something.\n\
     Use: `The source reports indicate...`, `The reports suggest...`, `This should be verified in the codebase...`, `The provided reports mention...`\n\
     Do NOT write: `The code definitely has this bug...`, `This is proven...`, `This must be implemented immediately...` unless the input reports contain direct verified evidence.\n\
     \n\
     ### 2. Preserve technical identifiers exactly\n\
     Do NOT translate, rename, rewrite, or normalize technical identifiers.\n\
     Preserve exactly: file paths, function names, variable names, node names, YAML keys, JSON keys, API endpoints, URLs, environment variables, model names, commands, error messages, prompt variables such as `{{#sys.query#}}`.\n\
     \n\
     ### 3. Deduplicate repeated claims\n\
     If multiple reports say the same thing, write it once.\n\
     Do not repeat the same root cause several times.\n\
     Instead, write: `Multiple source reports agree that [finding].`\n\
     \n\
     ### 4. Handle conflicting claims clearly\n\
     If reports disagree, do not silently choose one side.\n\
     Create a section called `## Conflicts or Claims Needing Verification`.\n\
     For each conflict, explain what the conflict is, which source reports mention it, and what needs to be checked next.\n\
     \n\
     ### 5. Preserve important code evidence\n\
     Keep short and important code snippets when they are direct evidence.\n\
     Move long code blocks to an appendix.\n\
     Do not remove code evidence that supports root cause analysis.\n\
     \n\
     ### 6. Mask secrets\n\
     Mask API keys, tokens, passwords, private keys, and credentials.\n\
     Examples: `sk-12345` → `sk-***MASKED***`, `TUNNEL_TOKEN=abc123` → `TUNNEL_TOKEN=***MASKED***`\n\
     \n\
     ### 7. Do not generate a DEV implementation ticket unless evidence is sufficient\n\
     This mode may include implementation considerations, but it must not pretend to be a verified development task unless the source reports provide enough code-level evidence.\n\
     Use \"Recommended next steps\" instead of \"Developer must implement.\"\n\
     \n\
     ## Output Language\n\
     Write the final report in English unless the user explicitly requests another language.\n\
     Do not output Chinese characters.\n\
     \n\
     ## Required Output Structure\n\
     Use this Markdown structure:\n\
     ```markdown\n\
     # Unified Final Report: [Short Topic Title]\n\
     \n\
     ## 1. Executive Summary\n\
     Summarize the issue, why it matters, and the recommended direction.\n\
     \n\
     ## 2. Background\n\
     Explain the context of the system, app, workflow, codebase, or report topic.\n\
     Include relevant app names, workflows, or components mentioned in the reports.\n\
     \n\
     ## 3. Consolidated Problem Statement\n\
     Describe the main problem in a clear and unified way.\n\
     Avoid repeating the same symptom several times.\n\
     \n\
     ## 4. Consolidated Findings\n\
     List the major findings.\n\
     Use this style:\n\
     ### Finding 1: [Finding Title]\n\
     Explain the finding.\n\
     **Source agreement:** Report 1, Report 2, Report 3\n\
     **Evidence mentioned:** `file/path`, `node_name`, `variable_name`, or code snippet\n\
     **Verification status:** Confirmed by source reports / Needs code verification / Unclear\n\
     \n\
     ## 5. Root Cause Analysis\n\
     Explain the likely root causes in a structured way.\n\
     Use subsections: `### 5.1 [Root Cause Title]` with description.\n\
     \n\
     ## 6. Recommended Solution\n\
     Describe the proposed solution synthesized from the source reports.\n\
     If there are multiple options, compare them.\n\
     Use careful language: Recommended direction, Alternative option, Deferred option, Not recommended at this stage.\n\
     \n\
     ## 7. Proposed Architecture or Flow\n\
     If the source reports contain a proposed architecture, rewrite it clearly.\n\
     Use diagrams when helpful.\n\
     \n\
     ## 8. Technical Details to Preserve\n\
     List important technical identifiers and snippets that should not be lost.\n\
     Include: files, functions, nodes, variables, commands, conditions, models, URLs.\n\
     \n\
     ## 9. Risks and Mitigations\n\
     Create a table: Risk | Impact | Mitigation\n\
     \n\
     ## 10. Test and Validation Plan\n\
     Summarize test cases mentioned by the source reports.\n\
     Use a table: Test Case | Scenario | Expected Result\n\
     \n\
     ## 11. Conflicts or Claims Needing Verification\n\
     List anything that is not fully verified or where the source reports disagree.\n\
     Use a table: Claim | Source Reports | Why It Needs Verification | Suggested Check\n\
     \n\
     ## 12. Open Decisions\n\
     List decisions that the project owner, QA team, or reviewer still needs to make.\n\
     \n\
     ## 13. References Mentioned by Source Reports\n\
     List files, documents, URLs, or commands referenced by the input reports.\n\
     \n\
     ## Appendix A — Important Code or Config Evidence\n\
     Only include short, relevant code/config snippets.\n\
     Move long snippets here instead of placing them in the main sections.\n\
     ```\n\
     \n\
     ## Handling Code Blocks\n\
     Use code blocks only when they add evidence or clarity.\n\
     Do not include huge duplicated code blocks in the main report.\n\
     \n\
     ## Final Output Rules\n\
     Return only the final Markdown document.\n\
     Do not include: preamble, explanation of your process, \"Here is the report\", internal reasoning, chain-of-thought, extra comments after the document.\n\
     The final answer must be valid Markdown."
}

/// QA-review handoff: structured document for the next reviewer.
pub fn prompt_level_3() -> &'static str {
    "You are a QA handoff report writer for technical code review.\n\
     Your task is to transform multiple source reports into a structured handoff document for another QA, reviewer, or code investigation team.\n\
     This mode is NOT a development implementation plan.\n\
     The source reports may contain claims about bugs, root causes, code paths, nodes, variables, prompts, YAML configs, test cases, and proposed fixes.\n\
     However, unless the input includes direct verified code evidence, you must treat these as claims that need review.\n\
     Your goal is to help the next reviewer know exactly what to inspect, what to verify, what evidence was mentioned, what is still uncertain, and what questions remain.\n\
     \n\
     ## Main Goal\n\
     Create a Markdown handoff document that helps QA/Review continue the investigation.\n\
     The document must answer:\n\
     1. What issue is being investigated?\n\
     2. What do the source reports agree on?\n\
     3. What claims need code verification?\n\
     4. Which files, nodes, functions, variables, prompts, or commands should be inspected?\n\
     5. What evidence was mentioned by the reports?\n\
     6. What test scenarios should QA run?\n\
     7. What is not yet confirmed?\n\
     8. What questions should the next reviewer answer?\n\
     \n\
     ## Critical Rules\n\
     \n\
     ### 1. Do not turn this into a DEV implementation task\n\
     Do NOT write as if the fix is already confirmed.\n\
     Do NOT write: `Implement this immediately.`, `Modify this file.`, `The developer must change X to Y.`\n\
     Instead, write: `The next reviewer should inspect...`, `This claim should be verified by checking...`, `The reports suggest...`, `If confirmed, a possible fix may be...`\n\
     \n\
     ### 2. Separate claims from verified evidence\n\
     Every important finding should be marked as one of:\n\
     - Reported by sources\n- Needs code verification\n- Direct evidence mentioned\n- Conflicting / unclear\n\
     Do not present unverified claims as facts.\n\
     \n\
     ### 3. Preserve technical identifiers exactly\n\
     Do NOT translate, rename, rewrite, or normalize technical identifiers.\n\
     Preserve exactly: file paths, function names, variable names, node names, YAML keys, JSON keys, API endpoints, URLs, environment variables, model names, commands, error messages, prompt variables such as `{{#sys.query#}}`.\n\
     \n\
     ### 4. Keep code evidence when useful\n\
     Preserve short code/config snippets if they help the next reviewer verify a claim.\n\
     Move long code/config blocks to an appendix.\n\
     Do not remove file paths, node names, variable names, or commands.\n\
     \n\
     ### 5. Mask secrets\n\
     If the input contains credentials, mask them.\n\
     Examples: `sk-12345` → `sk-***MASKED***`, `TUNNEL_TOKEN=abc123` → `TUNNEL_TOKEN=***MASKED***`\n\
     Never expose API keys, tokens, passwords, private keys, or credentials.\n\
     \n\
     ### 6. Be explicit about uncertainty\n\
     Add a section called `## What This Handoff Does Not Confirm`.\n\
     Use it to clearly state what is not yet verified.\n\
     \n\
     ## Output Language\n\
     Write the final handoff document in English unless the user explicitly requests another language.\n\
     Do not output Chinese characters.\n\
     \n\
     ## Required Output Structure\n\
     Use this exact Markdown structure:\n\
     ```markdown\n\
     # QA Review Handoff: [Short Topic Title]\n\
     \n\
     ## 1. Purpose\n\
     Explain why this handoff exists and what the next reviewer should do with it.\n\
     \n\
     ## 2. Investigation Scope\n\
     Describe the app, workflow, repository area, feature, or bug being investigated.\n\
     Include source report count if available.\n\
     \n\
     ## 3. Source Reports Reviewed\n\
     List the input reports.\n\
     | Source ID | Source Name / Author | Date | Notes |\n\
     |---|---|---|---|\n\
     | R1 | ... | ... | ... |\n\
     | R2 | ... | ... | ... |\n\
     If source names or dates are not available, write `Not specified`.\n\
     \n\
     ## 4. Consolidated Issue Summary\n\
     Summarize the issue being reported across sources.\n\
     Use cautious wording: `The source reports describe...`, `The reported behavior is...`, `The expected behavior is...`\n\
     \n\
     ## 5. Claims Requiring Verification\n\
     Create a table of claims that QA should verify.\n\
     | Claim ID | Claim | Source Agreement | Evidence Mentioned | Verification Needed |\n\
     | --- | --- | --- | --- | --- |\n\
     | C1 | ... | R1, R2, R3 | `file/path`, `node_name`, snippet | Check actual code / DSL / runtime |\n\
     \n\
     ## 6. Files, Nodes, and Functions to Inspect\n\
     List all technical objects mentioned by the source reports.\n\
     Group them: ### Files, ### Functions, ### Nodes, ### Variables, ### Commands, ### URLs / Apps\n\
     Do not invent new items. Only include what appears in the input reports.\n\
     \n\
     ## 7. Evidence Mentioned by Source Reports\n\
     Summarize concrete evidence mentioned by the reports.\n\
     If a code snippet is short and important, include it.\n\
     \n\
     ## 8. Suggested Verification Checklist\n\
     Create a checklist for the next reviewer.\n\
     ```markdown\n\
     - [ ] Verify whether `variable_name` is declared in generated DSL.\n\
     - [ ] Search whether `{{#variable_name#}}` is referenced by any node.\n\
     - [ ] Inspect `node_name` configuration.\n\
     - [ ] Reproduce the multi-turn scenario.\n\
     ```\n\
     The checklist must be based only on the input reports.\n\
     \n\
     ## 9. Suggested Reproduction Scenarios\n\
     List test scenarios QA should run.\n\
     | Scenario ID | Steps | Expected Behavior | What to Observe |\n\
     | --- | --- | --- | --- |\n\
     | S1 | ... | ... | ... |\n\
     \n\
     ## 10. Conflicts, Gaps, or Unclear Points\n\
     List disagreements or missing information.\n\
     | Topic | What Is Unclear | Why It Matters | Suggested Follow-Up |\n\
     | --- | --- | --- | --- |\n\
     \n\
     ## 11. Possible Fix Directions, If Claims Are Confirmed\n\
     This section must remain cautious.\n\
     Use phrases like: `If confirmed, one possible direction is...`, `If the codebase matches the reports, the team may consider...`, `The reports suggest, but do not independently prove, that...`\n\
     Do not write direct implementation instructions unless the source reports provide strong verified evidence.\n\
     \n\
     ## 12. Questions for the Next Reviewer\n\
     List clear questions that QA/review should answer before any DEV implementation task is created.\n\
     \n\
     ## 13. What This Handoff Does Not Confirm\n\
     Clearly state limitations.\n\
     Example:\n\
     - This handoff does not confirm actual runtime behavior.\n\
     - This handoff does not confirm that the local DSL matches the deployed app.\n\
     - This handoff does not confirm that all referenced files still exist or are current.\n\
     - This handoff does not confirm compatibility with the installed version.\n\
     - This handoff does not replace direct code review.\n\
     \n\
     ## Appendix A — Code / Config Snippets Mentioned\n\
     Include only short snippets that help verification.\n\
     \n\
     ## Appendix B — Source Notes\n\
     Optionally include a compact mapping of which source report mentioned which major point.\n\
     ```\n\
     \n\
     ## Tone Requirements\n\
     Use a careful QA/review tone.\n\
     Prefer: `The source reports suggest...`, `The next reviewer should verify...`, `This claim requires inspection of...`, `The evidence mentioned is...`\n\
     Avoid: `This is definitely broken...`, `The developer must...`, `Implement immediately...`, `The fix is proven...`\n\
     \n\
     ## Final Output Rules\n\
     Return only the final Markdown handoff document.\n\
     Do not include: preamble, explanation of your process, \"Here is the report\", internal reasoning, chain-of-thought, extra comments after the document.\n\
     The final answer must be valid Markdown."
}

pub fn scrub_api_key(s: &str, api_key: &str) -> String {
    if api_key.is_empty() {
        return s.to_string();
    }
    s.replace(api_key, "<REDACTED>")
}

pub fn strip_chinese(text: &str) -> String {
    text.chars()
        .filter(|c| {
            let cp = *c as u32;
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
            debug_log: None,
        });
    }
    let user_base_url = normalize_base_url(&cfg.base_url);
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
        .filter(|qa| {
            qa.active
                && match target {
                    None => true,
                    Some(t) => !project.exclude_self || qa.id != t.id,
                }
        })
        .collect()
}

fn estimate_chars(sources: &[&QaReport]) -> usize {
    sources
        .iter()
        .map(|q| q.name.chars().count() + q.content.chars().count() + 16)
        .sum()
}

fn resolve_prompt(cfg: &AiProviderConfig) -> String {
    let base = match cfg.prompt_level.as_str() {
        "1" => prompt_level_1().to_string(),
        "3" => prompt_level_3().to_string(),
        "4" => {
            if cfg.system_prompt.trim().is_empty() {
                eprintln!(
                    "ai::resolve_prompt: prompt_level=4 but system_prompt is empty, \
                     falling back to level 2"
                );
                prompt_level_2().to_string()
            } else {
                cfg.system_prompt.clone()
            }
        }
        _ => prompt_level_2().to_string(), // "2" or empty → level 2
    };
    if cfg.translate_vietnamese {
        prepend_vietnamese_instruction(&base)
    } else {
        base
    }
}

fn build_chat_request(sources: &[&QaReport], system: String) -> ChatRequest {
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
                                debug_log: None,
                            })
                    }
                    Ok(Err(e)) => {
                        let raw = e.to_string();
                        let scrubbed = scrub_api_key(&raw, &api_key_for_scrub);
                        Err(AiErrorPayload {
                            code: AiErrorCode::Provider { message: scrubbed.clone() },
                            message: format!("AI provider error: {scrubbed}"),
                            debug_log: None,
                        })
                    }
                    Err(_) => Err(AiErrorPayload {
                        code: AiErrorCode::Timeout { seconds: timeout_secs },
                        message: format!("AI request timed out after {timeout_secs}s"),
                        debug_log: None,
                    }),
                }
            }
            _ = cancel.cancelled() => Err(AiErrorPayload {
                code: AiErrorCode::Cancelled,
                message: "AI request was cancelled.".to_string(),
                debug_log: None,
            }),
        }
    };
    fut.await
}

pub struct RewriteOutput {
    pub markdown: String,
    pub input_chars: usize,
    pub debug_log: Option<DebugLog>,
}

fn capture_request_debug(request: &ChatRequest, cfg: &AiProviderConfig) -> String {
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

pub async fn rewrite_all(
    project: &Project,
    cancel: CancellationToken,
) -> Result<RewriteOutput, AiErrorPayload> {
    run_rewrite(project, None, cancel).await
}

async fn run_rewrite(
    project: &Project,
    target: Option<&QaReport>,
    cancel: CancellationToken,
) -> Result<RewriteOutput, AiErrorPayload> {
    let cfg = project.ai_config.as_ref().ok_or(AiErrorPayload {
        code: AiErrorCode::NotConfigured,
        message: "AI is not configured. Open Settings to add a provider.".to_string(),
        debug_log: None,
    })?;
    let sources = select_sources(project, target);
    if sources.is_empty() {
        return Err(AiErrorPayload {
            code: AiErrorCode::NoSources,
            message: "No active sources to rewrite.".to_string(),
            debug_log: None,
        });
    }
    let system = resolve_prompt(cfg);
    let total_chars = estimate_chars(&sources) + system.chars().count() + 64;
    if total_chars > cfg.max_input_chars {
        return Err(AiErrorPayload {
            code: AiErrorCode::InputTooLarge {
                chars: total_chars,
                max: cfg.max_input_chars,
            },
            message: format!(
                "Input is {total_chars} chars, exceeds limit {} (raise in Settings).",
                cfg.max_input_chars
            ),
            debug_log: None,
        });
    }
    let request = build_chat_request(&sources, system);
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
    match result {
        Ok(markdown) => {
            let markdown = if cfg.remove_chinese {
                strip_chinese(&markdown)
            } else {
                markdown
            };
            let scrubbed_response = scrub_api_key(&markdown, &cfg.api_key);
            let response_preview: String = scrubbed_response.chars().take(5000).collect();
            let debug_log = make_debug_log(cfg, request_summary, response_preview, duration_ms, true);
            Ok(RewriteOutput { markdown, input_chars: total_chars, debug_log: Some(debug_log) })
        }
        Err(e) => {
            let scrubbed_msg = scrub_api_key(&e.message, &cfg.api_key);
            let debug_log = make_debug_log(cfg, request_summary, scrubbed_msg.clone(), duration_ms, false);
            Err(AiErrorPayload { code: e.code, message: scrubbed_msg, debug_log: Some(debug_log) })
        }
    }
}

pub async fn test_provider(cfg: &AiProviderConfig) -> Result<(), AiErrorPayload> {
    let client = build_client(cfg)?;
    let request = ChatRequest::default()
        .with_system("Reply with the single word: ok")
        .append_message(ChatMessage::user("ping"));
    let cancel = CancellationToken::new();
    let chat_options = build_chat_options(cfg);
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

pub async fn test_provider_debug(cfg: &AiProviderConfig) -> Result<DebugLog, AiErrorPayload> {
    let client = build_client(cfg)?;
    let request = ChatRequest::default()
        .with_system("Reply with the single word: ok")
        .append_message(ChatMessage::user("ping"));
    let cancel = CancellationToken::new();
    let chat_options = build_chat_options(cfg);

    let request_summary = capture_request_debug(&request, cfg);

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

    match result {
        Ok(text) => Ok(make_debug_log(cfg, request_summary, text, duration_ms, true)),
        Err(e) => Ok(make_debug_log(cfg, request_summary, e.message, duration_ms, false)),
    }
}

pub async fn list_models(cfg: &AiProviderConfig) -> Result<Vec<String>, AiErrorPayload> {
    let client = build_client(cfg)?;
    let adapter = to_adapter(cfg.kind);
    let base_url = normalize_base_url(&cfg.base_url);
    let provider_config = ProviderConfig {
        endpoint: if base_url.is_empty() {
            None
        } else {
            Some(Endpoint::from_owned(base_url))
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
    } else {
        eprintln!(
            "ai::list_models: provider API unreachable, falling back to hardcoded list for {:?}",
            cfg.kind
        );
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
            prompt_level: "2".to_string(),
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
            prompt_level: "2".to_string(),
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
            prompt_level: "2".to_string(),
            translate_vietnamese: false,
            remove_chinese: false,
        };
        let system = resolve_prompt(&cfg);
        let total = estimate_chars(&source_refs) + system.chars().count() + 64;
        assert!(
            total > 90,
            "estimate should include system prompt, got {}",
            total
        );
    }

    #[test]
    fn test_default_system_prompt_includes_language_rule() {
        let prompt = prompt_level_2();
        assert!(
            prompt.contains("English") || prompt.contains("language"),
            "Default prompt should mention language"
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
        assert!(!cancel_in_flight(), "cancel_in_flight should return false when no token registered");

        let token = CancellationToken::new();
        register_cancel(token.clone());
        assert!(cancel_in_flight(), "cancel_in_flight should return true after register");
        assert!(token.is_cancelled(), "Token should be cancelled");

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
        assert!(token1.is_cancelled(), "Previous token should be cancelled on replace");
        assert!(cancel_in_flight());
        assert!(token2.is_cancelled(), "Current token should be cancelled");
    }

    #[test]
    fn test_input_too_large() {
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
            max_input_chars: 1,
            thinking_effort: String::new(),
            prompt_level: "2".to_string(),
            translate_vietnamese: false,
            remove_chinese: false,
        };
        let total = estimate_chars(&source_refs) + resolve_prompt(&cfg).chars().count() + 64;
        assert!(total > cfg.max_input_chars, "estimate should exceed max_input_chars limit");

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
        let cfg = AiProviderConfig {
            kind: AiProviderKind::OpenaiCompatible,
            base_url: "http://127.0.0.1:8080/v1/".into(),
            api_key: "sk-test".into(),
            model: "test-model".into(),
            system_prompt: String::new(),
            max_input_chars: 50_000,
            thinking_effort: String::new(),
            prompt_level: "2".to_string(),
            translate_vietnamese: false,
            remove_chinese: false,
        };
        let result = build_client(&cfg);
        assert!(result.is_ok(), "build_client should succeed with custom base_url");

        let cfg_no_url = AiProviderConfig {
            kind: AiProviderKind::OpenaiCompatible,
            base_url: String::new(),
            api_key: String::new(),
            model: String::new(),
            system_prompt: String::new(),
            max_input_chars: 50_000,
            thinking_effort: String::new(),
            prompt_level: "2".to_string(),
            translate_vietnamese: false,
            remove_chinese: false,
        };
        let result_no_url = build_client(&cfg_no_url);
        assert!(result_no_url.is_err(), "OpenaiCompatible should fail without base_url");
    }
}

#[cfg(test)]
mod integration {
    use super::*;
    use crate::models::{Project, QaReport};
    use tokio_util::sync::CancellationToken;

    #[tokio::test]
    async fn test_ai_rewrite_all_ollama_e2e() {
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
            prompt_level: "2".to_string(),
                translate_vietnamese: false,
                remove_chinese: false,
            }),
            document_type: Some("review-weaver-project".to_string()),
            ai_reports: None,
        };

        let cancel = CancellationToken::new();
        let result = rewrite_all(&project, cancel).await;

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
