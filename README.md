# CrucibleFish

A local-first startup-validation workbench. One persistent AI guide, 100 synthetic customers, and three temporal floors (Day 1, Day 14, Day 30) let you pressure-test a startup idea before you invest more time in it.

The guide fronts a chat conversation. The workbench beside it exposes the underlying market graph, social contagion, customer memories, telemetry, feature triage, and market hypotheses.

**Important:** every result is a synthetic hypothesis, not customer research, a revenue forecast, or verified market sizing. The app shows a persistent disclaimer; **Read the limits** explains the full boundary. Use the output to design real tests, not to replace them.

## Why I built this

I run a network of builders, and we catch ourselves reaching for AI too often. It is easy to generate a confident-looking plan and mistake it for real understanding. I wanted a place where an idea could be pressure-tested before anyone spends weeks building it: 100 synthetic customers with different habits and budgets, three time floors, social contagion, and a God's-eye pivot you can inject when the picture changes.

MiroFish was the inspiration for the swarm — the market graph, collective memory, and the ability to intervene in a running world. CrucibleFish keeps that spirit but stays local, dependency-free, and explicit about what the output is: a hypothesis workbench, not a prediction engine.

That is also why the disclaimer is the first thing you see, and why I added the **Evidence log**. Every week you can record what actually happened — interviews, churn, payments, the surprising thing a customer said — and the guide reasons over those real observations alongside the simulation. The machine proposes; you decide. Your own discernment comes first. The simulation is a mirror and a stress test, never the authority.

## Quick start

Requires Node.js 20 or newer. There are no package dependencies and no install step.

```powershell
cd C:\Users\alexi\vscode\cruciblefish
npm start
```

Open **http://localhost:4740**.

The PawsMatch demo loads automatically and needs no credentials. On a first visit you'll see a short onboarding tour (reopen it with the **?** button in the header) and the disclaimer strip under the header. Explore the demo first if you want to see the finished workbench before spending anything.

## Before a live run

Open **AI connections** from the header:

- **OpenAI API key** — paste a key here, or set `OPENAI_API_KEY` in `.env`. Without a key you can still use the illustrative demo.
- **Response model** — used for the venture critic and guide chat. Defaults to `gpt-4o`.
- **Fast swarm model** — used for the ontology and customer batches. Defaults to `gpt-4o-mini` on official connections, or the response model on a custom endpoint.
- **Custom base URL** — any OpenAI-compatible Chat Completions endpoint. Structured Outputs (`json_schema`) are attempted first, with `json_object` fallback.

Keys are sent only from the browser to the local Node server, then to your configured endpoint. They are never written into run JSON, run listings, or the settings API. **Remember keys in this browser** is opt-in; otherwise keys stay in tab-session storage. `.env` is gitignored.

### Endpoint tuning

A live run makes **2 + N provider calls**: one market ontology, one venture critic, and N customer batches (N = `100 / SWARM_BATCH_SIZE`). A custom Round-3 intervention makes N more calls.

Some endpoints reset long or concurrent requests. These optional `.env` settings make the pipeline more tolerant:

- `SWARM_BATCH_SIZE` — customers per batch, 5–20, default **20**. Lower to **10** if requests are reset.
- `SWARM_CONCURRENCY` — simultaneous batches, 1–5, default **2**. Lower to **1** if concurrent requests are reset.

With the defaults that is seven calls; with `SWARM_BATCH_SIZE=10` it is twelve. A batch that fails validation is retried once with a repair instruction. At official list prices a run costs roughly $0.10–0.15 with the default models; your endpoint's pricing may differ. Runs can take several minutes on slower providers — an animated progress panel shows each stage as it completes.

## How to use it

1. **New simulation** — fill in the brief: name, one-line pitch, target customer, geography, business model (who pays vs. who uses), pricing and packaging, traction, unfair advantages, and optional **seed material**. Seed material is the highest-return accuracy lever: paste real interview quotes, support logs, or analytics notes. To save time, enter a website and click **Auto-fill from website** — it reads the page's public metadata and structured data, fills only the fields it finds, and leaves the rest for you. Nothing is overwritten.
2. Add current features (tick the ones that need routine manual typing) and planned roadmap items with categories. **Load PawsMatch preset** fills a worked example.
3. **Run 100-customer simulation** and watch the progress panel: market graph, venture critique, each customer batch, then telemetry.
4. **Simulation** view — move among Day 1, Day 14, and Day 30; filter the 100 customers; inspect social threads and episodic memories.
5. **Venture critique** — feature triage, the four-stage data flywheel, the 90-day plan.
6. **Market & capital** — market graph, sizing hypotheses, and a VC shortlist. Verify all of it externally.
7. **Guide conversation** — ask about results, or about a customer by number (`#42`) or name. The guide is a reasoning partner, not an oracle.
8. **God's-eye pivot** — inject a Day-30 intervention. Only Round 3 changes; identities and Rounds 1–2 stay immutable.
9. **Evidence log** — record one real observation per week with cohort size, measured/estimated status, a linked run and hypothesis, an optional success threshold (e.g. paying rate ≥ 20%), the numbers, and a note. The form opens with a short "how to fill this in" guide and a worked example. Export or import the log as JSON/CSV. Entries stay in this browser.
10. **Include weekly evidence in this run** — the new-simulation form appends the last eight observations to the seed material, labelled as real observations. Uncheck it to keep evidence conversation-only.
11. **Calibration** — compare a linked run's predicted Day-30 active, paying, churn, and GMV with what you observed. A built-in 30-second guide explains what to read; bars show simulated vs real values, differences are spelled out in plain language, thresholds show PASS/MISS, and a summary shows the average gap and range across weeks. Estimated entries are de-emphasised.
12. **Explore demo** restores the original illustrative PawsMatch run at any time.

## Getting more accurate results

- Feed real evidence into the seed-material field.
- Run a few variations and keep patterns that stay stable; ignore numbers that swing wildly.
- Ask the guide to challenge assumptions, not to predict revenue.
- Validate important claims with real interviews, product analytics, and primary sources before committing time or money.
- Watch the Calibration summary over several weeks: a stable range matters more than a single week's gap. Use the threshold verdict as a falsifiable check, not a verdict on the whole idea.
- The output is a test plan, not the test result. See **ROADMAP.md** for the weekly experimentation direction.

## Validation

```powershell
npm test       # 24 tests, mocked providers, no paid calls
npm run check  # syntax check across all JavaScript modules
```

The suite covers provider normalization and streaming, Structured Output fallback, exact batch sizing, ontology and social-thread validation, stable demo telemetry, immutable Round-3 deltas, weekly evidence storage, MIME types, demo reset, and credential exclusion from saved files. Tests disable `.env` before loading modules, so they stay hermetic even when you have a real key configured.

A full live run was verified with real credentials; automated tests do not make paid calls.

## Project layout

```text
app/
  lib/          OpenAI client, orchestration, prompts, schemas, demo data, telemetry, env
  public/       Vanilla JS workbench, styles, local icons, Montserrat assets
  scripts/      Test and syntax-check suites
  server.mjs    Local HTTP, SSE progress, run persistence, static files
data/sessions/  Saved live runs (gitignored; credentials excluded)
types/          TypeScript declarations for the shared data model
qa/             Historical browser evidence and QA reports
ROADMAP.md      Experimentation direction and phased plan
PRODUCT.md      Product truth and constraints
DESIGN.md       Design-system record
```

## Provider boundary

Automated tests mock provider calls. Model entitlement, endpoint quirks, latency, and billing can only be verified with your credentials. No image service, Zep, or OASIS dependency is used; the guide avatar is a local initial and all computation runs in this local Node process.
