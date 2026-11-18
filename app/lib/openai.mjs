import { env } from "./env.mjs";

const RETRY = new Set([429, 500, 502, 503, 529]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (value) => String(value || "").trim();
function badRequest(message) { const error = new Error(message); error.status = 400; return error; }

export function chatCompletionsUrl(baseUrl = "") {
  const raw = clean(baseUrl) || "https://api.openai.com/v1";
  let url;
  try { url = new URL(raw); } catch { throw badRequest("Enter a valid OpenAI-compatible HTTP base URL."); }
  if (!["http:", "https:"].includes(url.protocol)) throw badRequest("The OpenAI base URL must use HTTP or HTTPS.");
  const pathname = url.pathname.replace(/\/+$/, "");
  url.pathname = pathname.endsWith("/chat/completions") ? pathname : `${pathname}/chat/completions`;
  return url.toString();
}

export function normalizeOpenAIConfig(settings = {}) {
  const baseUrl = clean(settings.baseUrl) || env("OPENAI_BASE_URL");
  const model = clean(settings.model) || env("OPENAI_MODEL") || "gpt-4o";
  return {
    apiKey: clean(settings.apiKey) || env("OPENAI_API_KEY"),
    model,
    fastModel: clean(settings.fastModel) || env("OPENAI_FAST_MODEL") || (baseUrl ? model : "gpt-4o-mini"),
    baseUrl,
  };
}

function providerError(status, body) {
  if (status === 401) return "The provider rejected this API key. Check the key and try again.";
  if (status === 402) return "The provider account has no available billing. Check its usage balance.";
  if (status === 403) return "This API project cannot use the selected model. Check model access.";
  if (status === 404) return "The selected model or OpenAI-compatible endpoint was not found.";
  if (status === 429) return "The provider rate or usage limit was reached. Check the account or try again later.";
  return `AI provider error ${status}: ${String(body || "Unknown provider response").slice(0, 350)}`;
}

async function request(settings, body, fetchImpl) {
  const config = normalizeOpenAIConfig(settings);
  if (!config.apiKey) throw new Error("Add an OpenAI API key in Settings before starting a live request.");
  for (let attempt = 0; attempt < 6; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(chatCompletionsUrl(config.baseUrl), {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, model: body.model || config.model }),
      });
    } catch (error) {
      if (attempt === 5) throw new Error(`Could not reach the AI provider: ${error.message}${error.cause?.code ? ` (${error.cause.code})` : ""}`);
      await sleep(Math.min(30000, 1000 * 2 ** attempt));
      continue;
    }
    if (response.ok) return response;
    const details = await response.text();
    const error = new Error(providerError(response.status, details));
    error.status = response.status;
    error.body = details;
    if (!RETRY.has(response.status) || /insufficient_quota|billing/i.test(details) || attempt === 5) throw error;
    await sleep(Math.min(15000, 700 * 2 ** attempt));
  }
  throw new Error("The AI provider kept refusing the request.");
}

function parseContent(response, json) {
  const choice = json.choices?.[0];
  if (choice?.finish_reason === "length") throw new Error("The model hit its completion limit. Reduce the batch detail or raise the token limit.");
  if (choice?.message?.refusal) throw new Error(`The model refused this simulation: ${choice.message.refusal}`);
  const content = choice?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("The model returned no structured response.");
  try { return JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, "")); }
  catch { throw new Error("The model returned invalid JSON. Try the run again or choose a model with Structured Outputs support."); }
}

export async function requestJson({
  settings = {}, model, system, prompt, schema, schemaName = "cruciblefish_response",
  maxTokens = 12000, temperature = 0.4, fetchImpl = globalThis.fetch,
}) {
  const body = {
    model, messages: [{ role: "system", content: String(system || "") }, { role: "user", content: String(prompt || "") }],
    max_completion_tokens: maxTokens, temperature,
  };
  let response;
  if (schema) {
    try {
      response = await request(settings, { ...body, response_format: { type: "json_schema", json_schema: { name: schemaName, strict: true, schema } } }, fetchImpl);
    } catch (error) {
      if (error.status !== 400 || !/response_format|json_schema|structured/i.test(error.body || error.message)) throw error;
      response = await request(settings, { ...body, response_format: { type: "json_object" } }, fetchImpl);
    }
  } else {
    response = await request(settings, { ...body, response_format: { type: "json_object" } }, fetchImpl);
  }
  return parseContent(response, await response.json());
}

export async function streamChat({
  settings = {}, system, messages, maxTokens = 2200, onText = () => {}, fetchImpl = globalThis.fetch,
}) {
  const history = (Array.isArray(messages) ? messages : [])
    .filter((message) => message && ["user", "assistant"].includes(message.role) && typeof message.content === "string")
    .slice(-18)
    .map((message) => ({ role: message.role, content: message.content.slice(0, 5000) }));
  if (history.at(-1)?.role !== "user") throw new Error("Send a message before asking the guide to reply.");
  const response = await request(settings, {
    messages: [{ role: "system", content: String(system || "") }, ...history],
    max_completion_tokens: maxTokens, stream: true, stream_options: { include_usage: true }, temperature: 0.5,
  }, fetchImpl);
  let text = "";
  let finish = null;
  let usage = null;
  let buffer = "";
  const decoder = new TextDecoder();
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let newline;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      let event;
      try { event = JSON.parse(payload); } catch { continue; }
      if (event.error) throw new Error(event.error.message || "The provider closed the chat stream.");
      const choice = event.choices?.[0];
      if (choice?.finish_reason) finish = choice.finish_reason;
      const delta = choice?.delta?.content;
      if (delta) { text += delta; onText(delta); }
      if (event.usage) usage = event.usage;
    }
  }
  if (!text.trim()) throw new Error("The guide returned an empty response. Try again or choose a different model.");
  return { text, truncated: finish === "length", usage };
}

export async function listProviderModels({ settings = {}, fetchImpl = globalThis.fetch } = {}) {
  const config = normalizeOpenAIConfig(settings);
  if (!config.apiKey) throw badRequest("Add an API key before testing the connection.");
  const endpoint = chatCompletionsUrl(config.baseUrl).replace(/\/chat\/completions$/, "/models");
  const response = await fetchImpl(endpoint, { headers: { Authorization: `Bearer ${config.apiKey}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(providerError(response.status, body.error?.message || JSON.stringify(body)));
  return (body.data || []).map((model) => model.id).filter(Boolean).sort().slice(0, 100);
}
