use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

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

#[derive(Debug, Deserialize)]
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
