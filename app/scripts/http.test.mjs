import "./test-env.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createAppServer } from "../server.mjs";
import { createDemoSimulation } from "../lib/simulation.mjs";

async function fixture(t, dependencies = {}) {
  const sessionsDir = fs.mkdtempSync(path.join(os.tmpdir(), "cruciblefish-http-"));
  const server = createAppServer({ sessionsDir, ...dependencies });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(sessionsDir, { recursive: true, force: true });
  });
  return { server, base, sessionsDir };
}

test("demo HTTP flow loads 100 customers, streams guide chat, and applies a local pivot", async (t) => {
  const { base } = await fixture(t, { streamChat: async () => { throw new Error("Live chat must not be used for the demo"); } });
  const demoResponse = await fetch(`${base}/api/demo`);
  assert.equal(demoResponse.status, 200);
  const demo = await demoResponse.json();
  assert.equal(demo.personas.length, 100);
  assert.equal(demo.telemetry.day14Active, 24);
  const originalRoundTwo = demo.personas[41].round2SocialContagionNote;
  const pivotResponse = await fetch(`${base}/api/runs/demo-pawsmatch/pivot`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ pivot: "Make accounts free and let clinics pay for structured intake." }),
  });
  assert.equal(pivotResponse.status, 200);
  const pivoted = await pivotResponse.json();
  assert.equal(pivoted.personas[41].round2SocialContagionNote, originalRoundTwo);
  assert.equal(pivoted.pivotHistory.length, 1);
  const chat = await fetch(`${base}/api/chat`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ runId: "demo-pawsmatch", character: { name: "Mara" }, messages: [{ role: "user", content: "What causes churn?" }] }),
  });
  assert.equal(chat.status, 200);
  assert.match(chat.headers.get("content-type"), /text\/event-stream/);
  const stream = await chat.text();
  assert.match(stream, /Manual Health Analytics|manual/i);
  assert.match(stream, /"done":true/);
  const reset = await fetch(`${base}/api/demo/reset`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  assert.equal(reset.status, 200);
  const restored = await reset.json();
  assert.equal(restored.telemetry.day30Active, 71);
  assert.equal(restored.pivotHistory.length, 0);
});

test("paid endpoints reject missing credentials before work begins", async (t) => {
  const { base } = await fixture(t);
  const demo = createDemoSimulation();
  const simulation = await fetch(`${base}/api/simulate`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: demo.input, settings: { apiKey: "" } }),
  });
  assert.equal(simulation.status, 503);
  assert.match((await simulation.json()).error, /API key/i);
  const removedImageRoute = await fetch(`${base}/api/character/generate`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ character: { name: "Mara" }, settings: {} }),
  });
  assert.equal(removedImageRoute.status, 404);
  const badPivot = await fetch(`${base}/api/runs/demo-pawsmatch/pivot`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pivot: "tiny" }),
  });
  assert.equal(badPivot.status, 400);
});

test("browser modules and the app shell are served with executable MIME types", async (t) => {
  const { base } = await fixture(t);
  for (const file of ["app.js", "client.mjs", "views.mjs"]) {
    const response = await fetch(`${base}/${file}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^text\/javascript/, file);
  }
  const shell = await fetch(`${base}/`);
  assert.equal(shell.status, 200);
  assert.match(shell.headers.get("content-type"), /^text\/html/);
  const shellHtml = await shell.text();
  assert.match(shellHtml, /Synthetic hypotheses, not customer research/i);
  assert.match(shellHtml, /id="limitsDialog"/);
  assert.match(shellHtml, /id="onboardingDialog"/);
  assert.doesNotMatch(shellHtml, /id="doodle"/);
  assert.doesNotMatch(shellHtml, /id="kieKey"/);
});

test("live run lifecycle saves results and events but never the browser API key", async (t) => {
  let receivedKey;
  const runSimulation = async (_input, settings, { onProgress }) => {
    receivedKey = settings.apiKey;
    onProgress({ phase: "complete", label: "Mock run complete", completed: 7, total: 7 });
    return { ...createDemoSimulation(), demo: false };
  };
  const { base, sessionsDir } = await fixture(t, { runSimulation });
  const input = createDemoSimulation().input;
  const started = await fetch(`${base}/api/simulate`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ input, settings: { apiKey: "browser-secret-key", model: "vendor-x" }, character: { name: "Mara" } }),
  });
  assert.equal(started.status, 202);
  const { id } = await started.json();
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(receivedKey, "browser-secret-key");
  const runResponse = await fetch(`${base}/api/runs/${id}`);
  const run = await runResponse.json();
  assert.equal(run.status, "complete");
  assert.equal(run.result.personas.length, 100);
  const saved = fs.readFileSync(path.join(sessionsDir, `${id}.json`), "utf8");
  assert.equal(saved.includes("browser-secret-key"), false);
  assert.equal(saved.includes("apiKey"), false);
  const events = await (await fetch(`${base}/api/runs/${id}/events`)).text();
  assert.match(events, /Mock run complete/);
  const list = await (await fetch(`${base}/api/runs`)).json();
  assert.equal(list.runs[0].id, id);
  assert.equal(JSON.stringify(list).includes("browser-secret-key"), false);
});
