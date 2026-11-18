export const DEFAULT_CHARACTER = {
  name: "Mara",
  role: "Venture simulation guide",
  personality: "Candid, warm, and exact. Push back on manual effort, vague assumptions, and premature complexity without performing cynicism.",
};
const CHARACTER_KEY = "cruciblefish-character-v1";
const SETTINGS_KEY = "cruciblefish-settings-v1";
const SESSION_KEYS = "cruciblefish-session-keys-v1";
const CHAT_KEY = "cruciblefish-chat-v1";
const parse = (raw, fallback = {}) => { try { return JSON.parse(raw || "") || fallback; } catch { return fallback; } };
const read = (storage, key, fallback = {}) => { try { return parse(storage.getItem(key), fallback); } catch { return fallback; } };
const write = (storage, key, value) => { try { storage.setItem(key, JSON.stringify(value)); } catch { /* local persistence is optional */ } };

export function loadCharacter() {
  return { ...DEFAULT_CHARACTER, ...read(localStorage, CHARACTER_KEY) };
}
export function saveCharacter(character) { write(localStorage, CHARACTER_KEY, character); }
export function loadSettings() {
  const config = { model: "gpt-4o", fastModel: "gpt-4o-mini", baseUrl: "", rememberKeys: false, ...read(localStorage, SETTINGS_KEY) };
  const remembered = config.rememberKeys ? config : {};
  const session = read(sessionStorage, SESSION_KEYS);
  return { ...config, apiKey: session.apiKey ?? remembered.apiKey ?? "" };
}
export function saveSettings(settings) {
  const config = { model: settings.model, fastModel: settings.fastModel, baseUrl: settings.baseUrl, rememberKeys: Boolean(settings.rememberKeys) };
  if (settings.rememberKeys) Object.assign(config, { apiKey: settings.apiKey || "" });
  write(localStorage, SETTINGS_KEY, config);
  try { localStorage.removeItem(SESSION_KEYS); } catch { /* storage can be unavailable */ }
  if (settings.rememberKeys) write(sessionStorage, SESSION_KEYS, {});
  else write(sessionStorage, SESSION_KEYS, { apiKey: settings.apiKey || "" });
}
export function loadChat(runId) {
  const saved = read(localStorage, CHAT_KEY);
  return saved.runId === runId && Array.isArray(saved.messages) ? saved.messages.slice(-50) : [];
}
export function saveChat(runId, messages) { write(localStorage, CHAT_KEY, { runId, messages: messages.slice(-50) }); }

export async function getJson(url) {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(body.error || `Request failed (${response.status}).`); error.status = response.status; throw error; }
  return body;
}
export async function postJson(url, payload) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(body.error || `Request failed (${response.status}).`); error.status = response.status; throw error; }
  return body;
}
export async function streamEvents(response, handlers) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error || `Request failed (${response.status}).`); error.status = response.status; throw error;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const consume = (line) => {
    const clean = line.trim();
    if (!clean.startsWith("data:")) return;
    let data;
    try { data = JSON.parse(clean.slice(5).trim()); } catch { return; }
    if (data.t) handlers.onText?.(data.t);
    handlers.onEvent?.(data);
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index;
    while ((index = buffer.indexOf("\n")) >= 0) { const line = buffer.slice(0, index); buffer = buffer.slice(index + 1); consume(line); }
  }
  if (buffer.trim()) consume(buffer);
}
