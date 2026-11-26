# CrucibleFish

A local-first startup-validation workbench. One persistent AI guide, 100 synthetic customers, and three time floors (Day 1, Day 14, Day 30) let you pressure-test a startup idea before you spend weeks building it.

## Run it locally

**Requirements:** Node.js 20 or newer. No package install, no database, no API key needed to try it.

```bash
git clone https://github.com/alexisvalentino/CrucibleFish.git
cd CrucibleFish
npm run dev
```

Then open the URL printed in the terminal. By default this is **http://localhost:4740**; if that port is occupied, `npm run dev` prints the next available URL.

To stop the server, press **Ctrl+C** in the terminal. `npm run dev` uses the configured port (default **4740**) and automatically checks the next 19 ports if it is already occupied. To choose a fixed port, set `PORT=4741` in `.env` (see `.env.example`). `npm start` runs directly on the configured port without the development port fallback.

The app starts empty — no demo data is loaded until you ask for it. Click **Explore demo** in the header to load the illustrated PawsMatch case study. A first visit shows a short onboarding tour (reopen it with the **?** button) where you can name your guide.

## Connect your own AI key (optional)

Open **AI connections** (gear icon in the header):

- **OpenAI API key** — paste it here, or set `OPENAI_API_KEY` in `.env`. Without a key you can still use the demo and most of the workbench.
- **Response model** — drives the venture critic and guide chat. Default `gpt-4o`.
- **Fast swarm model** — drives the ontology and customer batches. Default `gpt-4o-mini`.
- **Custom base URL** — any OpenAI-compatible Chat Completions endpoint. Structured Outputs are attempted first, with `json_object` fallback.

**AI connections → Test connection** does a free, read-only `GET /models` check.

Keys go browser → local Node server → your configured endpoint. They are never written into run JSON, run listings, or the settings API, and `.env` is gitignored. **Remember keys in this browser** is opt-in; otherwise keys stay in tab-session storage.

### Endpoint tuning

A live run makes **2 + N provider calls**: one ontology, one venture critic, and N customer batches (N = `100 / SWARM_BATCH_SIZE`). Testing an optional Day-30 change makes N more. Optional `.env` settings for endpoints that reset long or concurrent requests:

- `SWARM_BATCH_SIZE` — customers per batch, 5–20, default **20** (use **10** if requests reset).
- `SWARM_CONCURRENCY` — simultaneous batches, 1–5, default **2** (use **1** if concurrent requests reset).

With defaults that is seven calls; with `SWARM_BATCH_SIZE=10` it is twelve. Failed batches are retried once. At list prices a run costs roughly $0.10–0.15; slower endpoints may take several minutes — the animated progress panel shows each stage.

## What you can do

1. **New simulation** — enter a startup name, pitch, and target customer. Geography, business model, pricing, traction, unfair advantages, feature lists, future plans, and **seed material** (research notes, interview quotes, analytics) are optional. To save time, enter a website and click **Auto-fill from website** — it reads public metadata and uses a small AI call on the visible text, filling only fields you left empty. Never overwrites your typing.
2. Optionally add current features (tick routine manual input) and future plans. **Load PawsMatch preset** fills a worked example.
3. **Run 100-customer simulation** and watch the progress panel.
4. **Simulation** view — Day 1 / 14 / 30, the 100-customer grid, and **Social evidence**: channel and round filters, influenced customers linked to their Day-14 actions, and "ask the guide why this spread".
5. **Venture critique** — feature triage, data flywheel, 90-day plan. **Market & capital** — market graph, sizing hypotheses, VC shortlist.
6. **Guide conversation** — ask about results or a customer by `#42` or name. The guide is a reasoning partner, not an oracle.
7. **Optional change scenario** — the baseline evaluates the idea as described. If useful, test a future product or pricing change by re-running Day 30 while keeping Day 1, Day 14, and customer identities fixed.
8. **PDF report** — open a print-ready summary for any completed run and choose **Save as PDF** in your browser’s print dialog. The report is rendered locally from the saved result, makes no additional AI calls, labels synthetic hypotheses, and omits raw seed-material text.

All results are **synthetic hypotheses** — not customer research, revenue forecasts, verified market sizing, or investor interest. The app shows a persistent disclaimer; **Read the limits** opens the full boundary. Use the output to design real tests, not to replace them. See **ROADMAP.md** for the current simulation-first direction.

## Open source and contributions

CrucibleFish source code is available under the [MIT License](LICENSE). You may use, fork, edit, and redistribute it, including for commercial use, as long as you keep the copyright and license notice. You do not have to publish your modifications or send them upstream. Contributions are welcome — open an issue or pull request with a change you would like included.

The bundled Montserrat font files are separately licensed under the SIL Open Font License 1.1; see [app/public/fonts/OFL.txt](app/public/fonts/OFL.txt). The project’s MIT license does not replace the font license.

## Why I built this

I run a network of builders, and we catch ourselves reaching for AI too often. It is easy to generate a confident-looking plan and mistake it for real understanding. I wanted a place to pressure-test an idea before anyone spends weeks building it: 100 synthetic customers with different habits and budgets, three time floors, and optional future changes to compare when they are useful.

MiroFish inspired the swarm mechanics — market graph, collective memory, and the ability to test a change in the simulated world. CrucibleFish keeps that spirit but stays local, dependency-free, and explicit about what the output is: a hypothesis workbench, not a prediction engine.

The simulation is a starting point for sharper questions, not a substitute for customer conversations. Optional seed material can ground a run in notes you already have. The machine proposes; you decide. Your discernment comes first.

## Verify

```bash
npm test       # mocked providers, no paid calls
npm run check  # syntax check across all JavaScript modules
```

The suite covers provider normalization, Structured Output fallback, batch sizing, ontology and thread validation, demo telemetry, immutable Round-3 deltas, website extraction, credential exclusion, and HTTP workflows. Tests disable `.env` before loading modules, so they stay hermetic even when you have a real key configured. A full live run was verified separately with real credentials.

## Project layout

```text
app/
  lib/          OpenAI client, orchestration, prompts, schemas, discovery, demo data, telemetry, env
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

Automated tests mock provider calls. Model entitlement, endpoint quirks, latency, and billing can only be verified with your own credentials. No image service, Zep, or OASIS dependency is used; the guide avatar is a local initial and all computation runs in this local Node process.
