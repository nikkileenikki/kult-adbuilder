-- Single-row global config for which AI provider/model Design with AI uses. API keys
-- stay Cloudflare secrets (ANTHROPIC_API_KEY, OPENAI_API_KEY) — this table only ever
-- stores the provider/model choice, never a key.
CREATE TABLE IF NOT EXISTS ai_settings (
  id         TEXT PRIMARY KEY DEFAULT 'default',
  provider   TEXT NOT NULL DEFAULT 'anthropic', -- 'anthropic' | 'openai'
  model      TEXT NOT NULL DEFAULT 'claude-sonnet-5',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
