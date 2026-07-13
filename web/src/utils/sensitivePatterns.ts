// Shared filter for files whose contents must never leave the machine —
// neither persisted into session.json nor sent to an AI provider as context.
// Single source of truth so the session-save path and the AI-context path
// can't drift apart.

const SENSITIVE_PATTERNS = [
  /\.env(\.|$)/i,
  /\.(pem|key|p12|pfx|cert|crt)$/i,
  /id_(rsa|ed25519|ecdsa|dsa)(\.pub)?$/i,
  /ai-config\.json$/i,
  /ssh-connections\.json$/i,
  /known_hosts\.json$/i,
];

export function isSensitivePath(path: string): boolean {
  return SENSITIVE_PATTERNS.some(re => re.test(path));
}

// Placeholder substituted for sensitive file contents before they reach an
// AI provider, so the model still sees that a file was referenced.
export const SENSITIVE_PLACEHOLDER = '[민감 파일 — 내용 제외됨]';
