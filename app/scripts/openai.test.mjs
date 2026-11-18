import "./test-env.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { chatCompletionsUrl, normalizeOpenAIConfig, requestJson, streamChat } from "../lib/openai.mjs";

test("OpenAI-compatible base URLs normalize without duplicate paths", () => {
  assert.equal(chatCompletionsUrl(""), "https://api.openai.com/v1/chat/completions");
  assert.equal(chatCompletionsUrl("https://gateway.example/v1/"), "https://gateway.example/v1/chat/completions");
  assert.equal(chatCompletionsUrl("https://gateway.example/v1/chat/completions"), "https://gateway.example/v1/chat/completions");
  assert.throws(() => chatCompletionsUrl("file:///tmp/key"), /http/i);
  const config = normalizeOpenAIConfig({ apiKey: " browser-key ", model: " custom-model ", baseUrl: "https://gateway.example/v1" });
  assert.equal(config.apiKey, "browser-key");
  assert.equal(config.model, "custom-model");
  assert.equal(config.fastModel, "custom-model");
});

test("structured requests use the selected model and fall back for limited compatible providers", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    if (calls.length === 1) return Response.json({ error: { message: "response_format json_schema is unsupported" } }, { status: 400 });
    return Response.json({ choices: [{ message: { content: "{\"ok\":true}" }, finish_reason: "stop" }] });
  };
  const result = await requestJson({
    settings: { apiKey: "test", model: "vendor-x", baseUrl: "https://gateway.example/v1" },
    system: "Return JSON", prompt: "test", schemaName: "probe", schema: { type: "object" }, fetchImpl,
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.model, "vendor-x");
  assert.equal(calls[0].body.response_format.type, "json_schema");
  assert.equal(calls[1].body.response_format.type, "json_object");
  assert.equal(calls[0].body.max_tokens, undefined);
  assert.ok(calls[0].body.max_completion_tokens > 0);
});

test("guide chat streams SSE deltas and preserves the visible message history", async () => {
  const encoder = new TextEncoder();
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    const payload = [
      `data: ${JSON.stringify({ choices: [{ delta: { content: "Cut the " } }] })}\n\n`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: "manual log." }, finish_reason: "stop" }], usage: { prompt_tokens: 20, completion_tokens: 4 } })}\n\n`,
      "data: [DONE]\n\n",
    ].join("");
    return new Response(new ReadableStream({ start(controller) { controller.enqueue(encoder.encode(payload)); controller.close(); } }), { status: 200 });
  };
  const deltas = [];
  const result = await streamChat({
    settings: { apiKey: "secret", model: "gpt-4o-mini" },
    system: "You are Mara", messages: [{ role: "user", content: "What breaks?" }], onText: (text) => deltas.push(text), fetchImpl,
  });
  const body = JSON.parse(request.options.body);
  assert.equal(request.options.headers.Authorization, "Bearer secret");
  assert.deepEqual(body.messages.at(-1), { role: "user", content: "What breaks?" });
  assert.equal(body.stream, true);
  assert.equal(result.text, "Cut the manual log.");
  assert.deepEqual(deltas, ["Cut the ", "manual log."]);
  assert.equal(result.usage.completion_tokens, 4);
});

test("missing credentials fail before a provider request", async () => {
  let called = false;
  await assert.rejects(() => requestJson({ settings: { apiKey: "" }, system: "", prompt: "", fetchImpl: async () => { called = true; } }), /API key/i);
  assert.equal(called, false);
});
