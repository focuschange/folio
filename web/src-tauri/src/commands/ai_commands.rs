use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};

// ---------------------------------------------------------------------------
// Config: ~/.folio/ai-config.json
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConfig {
    pub provider: String,       // "claude"
    pub api_key: String,
    pub model: String,          // "claude-sonnet-4-20250514"
}

impl Default for AiConfig {
    fn default() -> Self {
        Self {
            provider: "claude".into(),
            api_key: String::new(),
            model: "claude-sonnet-4-20250514".into(),
        }
    }
}

fn config_path() -> PathBuf {
    let dir = dirs::home_dir().unwrap_or_default().join(".folio");
    fs::create_dir_all(&dir).ok();
    dir.join("ai-config.json")
}

#[tauri::command]
pub async fn load_ai_config() -> Result<String, String> {
    let path = config_path();
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())
    } else {
        let default = AiConfig::default();
        serde_json::to_string_pretty(&default).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn save_ai_config(config_json: String) -> Result<(), String> {
    let path = config_path();
    fs::write(&path, &config_json).map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Chat: call Anthropic Messages API
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize)]
pub struct ChatMessage {
    pub role: String,       // "user" | "assistant"
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct AiChatRequest {
    pub messages: Vec<ChatMessage>,
    pub context: Option<String>,   // current file content / selection for system prompt
}

#[derive(Debug, Serialize, Deserialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
    messages: Vec<AnthropicMessage>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AnthropicMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    content: Vec<AnthropicContent>,
}

#[derive(Debug, Deserialize)]
struct AnthropicContent {
    text: String,
}

#[derive(Debug, Deserialize)]
struct AnthropicError {
    error: AnthropicErrorDetail,
}

#[derive(Debug, Deserialize)]
struct AnthropicErrorDetail {
    message: String,
}

// ---------------------------------------------------------------------------
// OpenAI-compatible API types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
struct OpenAiRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<OpenAiMessage>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAiMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct OpenAiResponse {
    choices: Vec<OpenAiChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAiChoice {
    message: OpenAiChoiceMessage,
}

#[derive(Debug, Deserialize)]
struct OpenAiChoiceMessage {
    content: String,
}

#[derive(Debug, Deserialize)]
struct OpenAiError {
    error: OpenAiErrorDetail,
}

#[derive(Debug, Deserialize)]
struct OpenAiErrorDetail {
    message: String,
}

// ---------------------------------------------------------------------------
// Chat command — dispatches to Claude or OpenAI based on provider
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn ai_chat(messages: Vec<ChatMessage>, context: Option<String>) -> Result<String, String> {
    let config: AiConfig = {
        let path = config_path();
        if path.exists() {
            let json = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            serde_json::from_str(&json).unwrap_or_default()
        } else {
            AiConfig::default()
        }
    };

    if config.api_key.is_empty() {
        return Err("API key not configured. Please set it in Settings → AI.".into());
    }

    match config.provider.as_str() {
        "openai" => chat_openai(&config, &messages, context).await,
        _ => chat_claude(&config, &messages, context).await,   // "claude" default
    }
}

async fn chat_claude(config: &AiConfig, messages: &[ChatMessage], context: Option<String>) -> Result<String, String> {
    let system = context.map(|ctx| {
        format!(
            "You are a helpful AI coding assistant inside the Folio text editor. \
             The user is currently editing a file. Here is the relevant context:\n\n\
             ```\n{}\n```\n\n\
             Answer concisely. Use markdown formatting for code blocks.",
            ctx
        )
    });

    let api_messages: Vec<AnthropicMessage> = messages
        .iter()
        .map(|m| AnthropicMessage { role: m.role.clone(), content: m.content.clone() })
        .collect();

    let body = AnthropicRequest {
        model: config.model.clone(),
        max_tokens: 4096,
        system,
        messages: api_messages,
    };

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &config.api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = response.status();
    let body_text = response.text().await.map_err(|e| format!("Response read error: {}", e))?;

    if !status.is_success() {
        if let Ok(err) = serde_json::from_str::<AnthropicError>(&body_text) {
            return Err(format!("API error ({}): {}", status.as_u16(), err.error.message));
        }
        return Err(format!("API error ({}): {}", status.as_u16(), body_text));
    }

    let parsed: AnthropicResponse = serde_json::from_str(&body_text)
        .map_err(|e| format!("Response parse error: {}", e))?;

    parsed.content.first().map(|c| c.text.clone())
        .ok_or_else(|| "Empty response from API".into())
}

async fn chat_openai(config: &AiConfig, messages: &[ChatMessage], context: Option<String>) -> Result<String, String> {
    let mut api_messages: Vec<OpenAiMessage> = Vec::new();

    // System message with context
    if let Some(ctx) = context {
        api_messages.push(OpenAiMessage {
            role: "system".into(),
            content: format!(
                "You are a helpful AI coding assistant inside the Folio text editor. \
                 The user is currently editing a file. Here is the relevant context:\n\n\
                 ```\n{}\n```\n\n\
                 Answer concisely. Use markdown formatting for code blocks.",
                ctx
            ),
        });
    } else {
        api_messages.push(OpenAiMessage {
            role: "system".into(),
            content: "You are a helpful AI coding assistant inside the Folio text editor. Answer concisely. Use markdown formatting for code blocks.".into(),
        });
    }

    // User/assistant messages
    for m in messages {
        api_messages.push(OpenAiMessage { role: m.role.clone(), content: m.content.clone() });
    }

    let body = OpenAiRequest {
        model: config.model.clone(),
        max_tokens: 4096,
        messages: api_messages,
    };

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = response.status();
    let body_text = response.text().await.map_err(|e| format!("Response read error: {}", e))?;

    if !status.is_success() {
        if let Ok(err) = serde_json::from_str::<OpenAiError>(&body_text) {
            return Err(format!("API error ({}): {}", status.as_u16(), err.error.message));
        }
        return Err(format!("API error ({}): {}", status.as_u16(), body_text));
    }

    let parsed: OpenAiResponse = serde_json::from_str(&body_text)
        .map_err(|e| format!("Response parse error: {}", e))?;

    parsed.choices.first().map(|c| c.message.content.clone())
        .ok_or_else(|| "Empty response from API".into())
}

// ---------------------------------------------------------------------------
// Streaming chat — emits ai-chunk-{request_id}, ai-done-{request_id}, ai-error-{request_id}
// ---------------------------------------------------------------------------

fn load_config() -> AiConfig {
    let path = config_path();
    if path.exists() {
        fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    } else {
        AiConfig::default()
    }
}

fn build_system_with_context(context: Option<String>, override_system: Option<String>) -> Option<String> {
    if let Some(s) = override_system {
        return Some(s);
    }
    context.map(|ctx| {
        format!(
            "You are a helpful AI coding assistant inside the Folio text editor. \
             The user is currently editing a file. Here is the relevant context:\n\n\
             ```\n{}\n```\n\n\
             Answer concisely. Use markdown formatting for code blocks.",
            ctx
        )
    })
}

#[tauri::command]
pub async fn ai_chat_stream(
    app: AppHandle,
    request_id: String,
    messages: Vec<ChatMessage>,
    context: Option<String>,
    system_override: Option<String>,
) -> Result<(), String> {
    let config = load_config();
    if config.api_key.is_empty() {
        let _ = app.emit(
            &format!("ai-error-{}", request_id),
            json!({ "error": "API key not configured. Please set it in Settings → AI." }),
        );
        return Err("API key not configured".into());
    }

    let system = build_system_with_context(context, system_override);

    let result = match config.provider.as_str() {
        "openai" => stream_openai(&app, &request_id, &config, &messages, system).await,
        _ => stream_claude(&app, &request_id, &config, &messages, system).await,
    };

    match result {
        Ok(full_text) => {
            let _ = app.emit(
                &format!("ai-done-{}", request_id),
                json!({ "full_text": full_text }),
            );
            Ok(())
        }
        Err(e) => {
            let _ = app.emit(
                &format!("ai-error-{}", request_id),
                json!({ "error": e.clone() }),
            );
            Err(e)
        }
    }
}

/// AI-powered inline edit — returns edited code only (no prose).
/// Uses same streaming infrastructure so the frontend can show tokens as they arrive.
#[tauri::command]
pub async fn ai_edit(
    app: AppHandle,
    request_id: String,
    instruction: String,
    selected_code: String,
    language: Option<String>,
) -> Result<(), String> {
    let lang = language.unwrap_or_else(|| "plaintext".into());
    let system = format!(
        "You are a precise code editor. The user provides an instruction and a code snippet. \
         Apply the instruction to the code and return ONLY the edited code. \
         Rules:\n\
         - No explanations, no commentary, no prose.\n\
         - No markdown code fences (no ```).\n\
         - Preserve the original indentation style and leading/trailing whitespace pattern.\n\
         - Language: {}",
        lang
    );
    let user_content = format!(
        "Instruction: {}\n\nCode:\n{}",
        instruction, selected_code
    );
    let messages = vec![ChatMessage { role: "user".into(), content: user_content }];
    ai_chat_stream(app, request_id, messages, None, Some(system)).await
}

async fn stream_claude(
    app: &AppHandle,
    request_id: &str,
    config: &AiConfig,
    messages: &[ChatMessage],
    system: Option<String>,
) -> Result<String, String> {
    let api_messages: Vec<AnthropicMessage> = messages
        .iter()
        .map(|m| AnthropicMessage { role: m.role.clone(), content: m.content.clone() })
        .collect();

    let mut body = json!({
        "model": config.model,
        "max_tokens": 4096,
        "stream": true,
        "messages": api_messages,
    });
    if let Some(s) = system {
        body["system"] = json!(s);
    }

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &config.api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let text = response.text().await.unwrap_or_default();
        if let Ok(err) = serde_json::from_str::<AnthropicError>(&text) {
            return Err(format!("API error ({}): {}", status.as_u16(), err.error.message));
        }
        return Err(format!("API error ({}): {}", status.as_u16(), text));
    }

    let chunk_event = format!("ai-chunk-{}", request_id);
    let mut stream = response.bytes_stream();
    let mut buf = Vec::<u8>::new();
    let mut full_text = String::new();

    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|e| format!("Stream error: {}", e))?;
        buf.extend_from_slice(&bytes);

        while let Some(pos) = buf.iter().position(|&b| b == b'\n') {
            let line: Vec<u8> = buf.drain(..=pos).collect();
            let line_str = std::str::from_utf8(&line).unwrap_or("").trim();
            let Some(data) = line_str.strip_prefix("data:") else { continue };
            let data = data.trim();
            if data.is_empty() { continue; }

            if let Ok(v) = serde_json::from_str::<serde_json::Value>(data) {
                if v.get("type").and_then(|t| t.as_str()) == Some("content_block_delta") {
                    if let Some(text) = v.pointer("/delta/text").and_then(|t| t.as_str()) {
                        full_text.push_str(text);
                        let _ = app.emit(&chunk_event, json!({ "text": text }));
                    }
                }
            }
        }
    }

    Ok(full_text)
}

async fn stream_openai(
    app: &AppHandle,
    request_id: &str,
    config: &AiConfig,
    messages: &[ChatMessage],
    system: Option<String>,
) -> Result<String, String> {
    let mut api_messages: Vec<OpenAiMessage> = Vec::new();
    api_messages.push(OpenAiMessage {
        role: "system".into(),
        content: system.unwrap_or_else(|| {
            "You are a helpful AI coding assistant inside the Folio text editor. Answer concisely. Use markdown formatting for code blocks.".into()
        }),
    });
    for m in messages {
        api_messages.push(OpenAiMessage { role: m.role.clone(), content: m.content.clone() });
    }

    let body = json!({
        "model": config.model,
        "max_tokens": 4096,
        "stream": true,
        "messages": api_messages,
    });

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("content-type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let text = response.text().await.unwrap_or_default();
        if let Ok(err) = serde_json::from_str::<OpenAiError>(&text) {
            return Err(format!("API error ({}): {}", status.as_u16(), err.error.message));
        }
        return Err(format!("API error ({}): {}", status.as_u16(), text));
    }

    let chunk_event = format!("ai-chunk-{}", request_id);
    let mut stream = response.bytes_stream();
    let mut buf = Vec::<u8>::new();
    let mut full_text = String::new();

    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|e| format!("Stream error: {}", e))?;
        buf.extend_from_slice(&bytes);

        while let Some(pos) = buf.iter().position(|&b| b == b'\n') {
            let line: Vec<u8> = buf.drain(..=pos).collect();
            let line_str = std::str::from_utf8(&line).unwrap_or("").trim();
            let Some(data) = line_str.strip_prefix("data:") else { continue };
            let data = data.trim();
            if data.is_empty() || data == "[DONE]" { continue; }

            if let Ok(v) = serde_json::from_str::<serde_json::Value>(data) {
                if let Some(text) = v.pointer("/choices/0/delta/content").and_then(|t| t.as_str()) {
                    if !text.is_empty() {
                        full_text.push_str(text);
                        let _ = app.emit(&chunk_event, json!({ "text": text }));
                    }
                }
            }
        }
    }

    Ok(full_text)
}
