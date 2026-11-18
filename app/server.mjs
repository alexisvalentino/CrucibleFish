import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { APP_ROOT, REPO_ROOT, env } from "./lib/env.mjs";
import { normalizeOpenAIConfig, streamChat, listProviderModels } from "./lib/openai.mjs";
import { runCrucibleSimulation, reSimulateRound3, applyDemoPivot, createDemoSimulation, demoGuideReply, validateStartupInput } from "./lib/simulation.mjs";
import { buildGuidePrompt, findMentionedPersona } from "./lib/prompts.mjs";
import { discoverIntake } from "./lib/discover.mjs";

const PUBLIC = path.join(APP_ROOT, "public");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".ico": "image/x-icon", ".json": "application/json", ".ttf": "font/ttf", ".txt": "text/plain; charset=utf-8" };
const SECURITY = { "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "content-security-policy": "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" };
const clean = (value, max = 500) => String(value || "").trim().slice(0, max);

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { ...SECURITY, "content-type": type, "cache-control": "no-store" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}
function event(res, data) { res.write(`data: ${JSON.stringify(data)}\n\n`); }
function settingsFrom(body = {}) {
  return {
    apiKey: clean(body.settings?.apiKey, 500), model: clean(body.settings?.model, 120),
    fastModel: clean(body.settings?.fastModel, 120), baseUrl: clean(body.settings?.baseUrl, 600),
  };
}
function characterFrom(body = {}) {
  return {
    name: clean(body.character?.name, 60) || "Mara", role: clean(body.character?.role, 140) || "Venture simulation guide",
    personality: clean(body.character?.personality, 500),
  };
}
async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_500_000) { const error = new Error("Request body is too large."); error.status = 413; throw error; }
  }
  try { return raw ? JSON.parse(raw) : {}; } catch { const error = new Error("Request body must be valid JSON."); error.status = 400; throw error; }
}
function validId(id) { return /^[a-zA-Z0-9-]{1,80}$/.test(id); }

export function createAppServer(options = {}) {
  const sessionsDir = options.sessionsDir || path.join(REPO_ROOT, "data", "sessions");
  fs.mkdirSync(sessionsDir, { recursive: true });
  const runSimulation = options.runSimulation || runCrucibleSimulation;
  const chatCompletion = options.streamChat || streamChat;
  const intakeDiscovery = options.intakeDiscovery || discoverIntake;
  const runs = new Map();
  let demo = createDemoSimulation();
  const persist = (result) => {
    if (result.demo) return;
    const file = path.join(sessionsDir, `${result.id}.json`);
    fs.writeFileSync(file, JSON.stringify(result, null, 2));
  };
  const loadResult = (id) => {
    if (id === "demo-pawsmatch") return demo;
    if (!validId(id)) return null;
    if (runs.get(id)?.result) return runs.get(id).result;
    const file = path.join(sessionsDir, `${id}.json`);
    if (!fs.existsSync(file)) return null;
    try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
  };
  const emit = (run, data) => {
    const item = { ...data, at: data.at || new Date().toISOString() };
    run.events.push(item);
    for (const res of run.subscribers) event(res, item);
    if (["complete", "error"].includes(item.phase)) {
      for (const res of run.subscribers) res.end();
      run.subscribers.clear();
    }
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const route = url.pathname;
    try {
      if (route === "/api/config" && req.method === "GET") return send(res, 200, {
        hasServerOpenAIKey: Boolean(env("OPENAI_API_KEY")),
        defaultModel: env("OPENAI_MODEL") || "gpt-4o", defaultFastModel: env("OPENAI_FAST_MODEL") || "gpt-4o-mini",
      });
      if (route === "/api/intake/discover" && req.method === "POST") {
        const body = await readJson(req);
        const result = await intakeDiscovery({ name: clean(body.name, 100), websiteUrl: clean(body.websiteUrl, 600) });
        return send(res, 200, result);
      }
      if (route === "/api/demo/reset" && req.method === "POST") { demo = createDemoSimulation(); return send(res, 200, demo); }
      if (route === "/api/demo" && req.method === "GET") return send(res, 200, demo);
      if (route === "/api/runs" && req.method === "GET") {
        const saved = fs.readdirSync(sessionsDir).filter((file) => file.endsWith(".json")).map((file) => {
          try {
            const result = JSON.parse(fs.readFileSync(path.join(sessionsDir, file), "utf8"));
            return { id: result.id, startupName: result.input?.startupName || "Untitled simulation", createdAt: result.createdAt, demo: false, telemetry: result.telemetry };
          } catch { return null; }
        }).filter(Boolean);
        const active = [...runs.values()].filter((run) => run.status === "running").map((run) => ({ id: run.id, startupName: run.input.startupName, createdAt: run.createdAt, status: run.status }));
        return send(res, 200, { runs: [...active, ...saved].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))) });
      }
      if (route === "/api/settings/test" && req.method === "POST") {
        const body = await readJson(req);
        const models = await (options.listProviderModels || listProviderModels)({ settings: settingsFrom(body) });
        return send(res, 200, { ok: true, models });
      }
      if (route === "/api/simulate" && req.method === "POST") {
        const body = await readJson(req);
        const input = validateStartupInput(body.input);
        const settings = settingsFrom(body);
        if (!normalizeOpenAIConfig(settings).apiKey) return send(res, 503, { error: "Add an OpenAI API key in Settings before running a live simulation." });
        const id = randomUUID();
        const run = { id, status: "running", input, character: characterFrom(body), settings, createdAt: new Date().toISOString(), result: null, events: [], subscribers: new Set() };
        runs.set(id, run);
        setImmediate(async () => {
          try {
            const result = await runSimulation(input, settings, { onProgress: (progress) => emit(run, progress) });
            result.id = id;
            result.demo = false;
            run.result = result;
            run.status = "complete";
            persist(result);
            if (run.events.at(-1)?.phase !== "complete") emit(run, { phase: "complete", label: "All 100 customers are ready", completed: 7, total: 7 });
            else for (const subscriber of run.subscribers) subscriber.end();
            run.subscribers.clear();
          } catch (error) {
            run.status = "error";
            emit(run, { phase: "error", error: clean(error.message, 800) || "The simulation could not finish." });
          }
        });
        return send(res, 202, { id, status: "running" });
      }
      const runMatch = route.match(/^\/api\/runs\/([^/]+)$/);
      if (runMatch && req.method === "GET") {
        const id = decodeURIComponent(runMatch[1]);
        const run = runs.get(id);
        if (run) return send(res, 200, { id, status: run.status, events: run.events, result: run.result, character: run.character });
        const result = loadResult(id);
        return result ? send(res, 200, { id, status: "complete", events: [], result }) : send(res, 404, { error: "Simulation not found." });
      }
      const eventsMatch = route.match(/^\/api\/runs\/([^/]+)\/events$/);
      if (eventsMatch && req.method === "GET") {
        const id = decodeURIComponent(eventsMatch[1]);
        const run = runs.get(id);
        if (!run) return loadResult(id) ? send(res, 200, { status: "complete" }) : send(res, 404, { error: "Simulation not found." });
        res.writeHead(200, { ...SECURITY, "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", connection: "keep-alive" });
        res.write(": connected\n\n");
        for (const item of run.events) event(res, item);
        if (run.status !== "running") { res.end(); return; }
        run.subscribers.add(res);
        res.on("close", () => run.subscribers.delete(res));
        return;
      }

      const pivotMatch = route.match(/^\/api\/runs\/([^/]+)\/pivot$/);
      if (pivotMatch && req.method === "POST") {
        const id = decodeURIComponent(pivotMatch[1]);
        const body = await readJson(req);
        const pivot = clean(body.pivot, 3000);
        if (pivot.length < 8) return send(res, 400, { error: "Describe the intervention in at least 8 characters." });
        const current = loadResult(id);
        if (!current) return send(res, 404, { error: "Load a completed simulation before testing a pivot." });
        const settings = settingsFrom(body);
        const hasKey = Boolean(normalizeOpenAIConfig(settings).apiKey);
        if (!current.demo && !hasKey) return send(res, 503, { error: "Add an OpenAI API key to re-simulate this live run." });
        const result = current.demo && !hasKey ? applyDemoPivot(current, pivot) : await reSimulateRound3(current, pivot, settings);
        result.id = id;
        if (result.demo) demo = result;
        else {
          if (runs.has(id)) runs.get(id).result = result;
          persist(result);
        }
        return send(res, 200, result);
      }
      if (route === "/api/chat" && req.method === "POST") {
        const body = await readJson(req);
        const messages = Array.isArray(body.messages) ? body.messages.slice(-18) : [];
        if (messages.at(-1)?.role !== "user" || !clean(messages.at(-1)?.content, 5000)) return send(res, 400, { error: "Write a message before asking the guide." });
        const runId = clean(body.runId, 80) || "demo-pawsmatch";
        const result = loadResult(runId);
        const character = characterFrom(body);
        const selectedPersona = result?.personas?.find((persona) => persona.id === Number(body.selectedPersonaId)) || findMentionedPersona(result, messages.at(-1)?.content);
        const settings = settingsFrom(body);
        const realEvidence = clean(body.evidence, 4000);
        const config = normalizeOpenAIConfig(settings);
        if (!config.apiKey && !result?.demo) return send(res, 503, { error: "Add an OpenAI API key in Settings to chat with your guide." });
        res.writeHead(200, { ...SECURITY, "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", connection: "keep-alive" });
        res.write(": connected\n\n");
        let closed = false;
        res.on("close", () => { closed = true; });
        try {
          if (!config.apiKey && result?.demo) {
            const answer = demoGuideReply(messages.at(-1).content, result, selectedPersona);
            for (const piece of answer.match(/.{1,90}(?:\s|$)/g) || [answer]) if (!closed) event(res, { t: piece });
            if (!closed) event(res, { done: true, demo: true });
          } else {
            const completion = await chatCompletion({
              settings, system: buildGuidePrompt(character, result, selectedPersona, realEvidence), messages,
              onText: (text) => { if (!closed) event(res, { t: text }); },
            });
            if (!closed) event(res, { done: true, truncated: completion.truncated, usage: completion.usage });
          }
        } catch (error) {
          if (!closed) event(res, { error: clean(error.message, 800) || "The guide could not answer." });
        }
        if (!closed) res.end();
        return;
      }

      if (route.startsWith("/api/")) return send(res, 404, { error: "API route not found." });
      if (!["GET", "HEAD"].includes(req.method)) return send(res, 405, "Method not allowed", "text/plain; charset=utf-8");
      let file = path.resolve(PUBLIC, `.${decodeURIComponent(route)}`);
      if (file !== PUBLIC && !file.startsWith(PUBLIC + path.sep)) return send(res, 404, "Not found", "text/plain; charset=utf-8");
      if (file === PUBLIC || (fs.existsSync(file) && fs.statSync(file).isDirectory())) file = path.join(file, "index.html");
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, "Not found", "text/plain; charset=utf-8");
      res.writeHead(200, { ...SECURITY, "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      if (req.method === "HEAD") return res.end();
      fs.createReadStream(file).pipe(res);
      return;
    } catch (error) {
      if (res.headersSent) { res.end(); return; }
      const validation = /Complete the|Describe the|Add at least|Every .* needs|valid JSON|at least 8 characters|valid website URL|http and https|website URL first|Private network|not reachable|redirected too many times|website returned|readable web page/i.test(error.message);
      return send(res, error.status || (validation ? 400 : 500), { error: clean(error.message, 800) || "Unexpected server error." });
    }
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || env("PORT")) || 4740;
  const server = createAppServer();
  server.listen(port, "127.0.0.1", () => console.log(`CrucibleFish on http://localhost:${port}`));
}
