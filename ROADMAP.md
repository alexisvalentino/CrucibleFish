# CrucibleFish roadmap — from simulation to a weekly experimentation loop

## Guiding principle

Keep the local architecture. Do not mistake precision for accuracy. The workbench is good at generating and stress-testing ideas; the moment we need real answers, we need real people. No engine substitutes for that.

The five practices that drive this roadmap:

1. **Feed real evidence** into the seed-material field — interview quotes, support logs, analytics exports. This is the highest-return change available.
2. **Run several variations** and look for patterns that stay stable across runs; ignore numbers that swing wildly.
3. **Use the guide as a reasoning partner, not an oracle** — ask it to challenge assumptions, not to predict revenue.
4. **Validate with real customers before deciding.** The output is a test plan, not the test result.
5. **P1 (sequential passes) later** fixes the one-completion weakness without new infrastructure.

## Where we are now (foundation, shipped)

- Grounded intake: target customer, geography, business model, pricing, traction, unfair advantages, optional seed evidence.
- De-biased swarm prompts: personas evaluate friction instead of being told the answer.
- Validated social contagion: six threads, valid persona IDs, routed only to affected batches.
- Guide resolves a mentioned persona by ID or name and can see an evidence excerpt.
- Persistent in-app disclaimer plus a full "Read the limits" dialog.
- Strict local boundary: 7 mocked-provider calls, no paid calls in tests, keys never saved into run files.

## Direction: an experimentation workbench

The product becomes a loop, not a one-off report:

```
real weekly observations  →  hypotheses to test  →  simulation pressure-test
        ↑                                                    │
        └──────────────── decisions & results ────────────────┘
```

Real data is first-class and visually separate from synthetic output. Every week the founder records what actually happened; the guide reasons over both, and the workbench gradually shows where the model has been right and wrong.

### Phase E0 — Weekly evidence log (shipped)

- Add an **Evidence log** view where the founder records one observation per week: week ending, cohort size, measured vs. estimated, linked run and hypothesis, interviews, active customers, churned, paid conversions, GMV, and a note.
- Entries are stored locally in the browser, kept separate from run JSON, and can be exported/imported as JSON or CSV.
- The guide receives a compact digest of real observations and treats them as *observed fact*, never as simulation output.
- The last eight observations can be appended to a new run's seed material with an explicit checkbox.
- Deliberately not a metric dashboard: the point is a trustworthy ledger of what actually happened.

### Phase E1 — Hypothesis ledger (next)

- Turn each critique into explicit, falsifiable hypotheses: "If we remove routine typing, Day-14 repeat use will rise among event attendees."
- Attach each hypothesis to a proposed test, a success threshold, and a target week.
- The guide challenges the hypothesis rather than confirming it.
- Acceptance: a founder can list what they believe, how they would know it is wrong, and when they will check.

### Phase E2 — Calibration view (shipped)

- **Shipped:** cohort-normalised side-by-side comparison for observations linked to a run — Day-30 active, paying, churn (as a rate), and GMV (scaled from per-100 to the observed cohort).
- **Shipped:** optional per-observation success thresholds with PASS/MISS verdicts, plus measured/estimated labelling.
- **Shipped:** average and range across weeks, with a caveat that cohorts and timing may differ.
- Still to do: automatic detection of which claim types are consistently wrong, and ranges across repeated *runs* rather than repeated weeks.
- Acceptance: after several weeks, the founder can see whether the simulation's directional calls held up.

### Phase E3 — Weekly review rhythm

- A guided weekly flow: log observations → ask the guide what changed → update or kill hypotheses → decide the next test.
- Evidence automatically appended to the seed material of a new run, with an explicit toggle so it is never silent.
- Acceptance: the whole loop can be completed in a few minutes each week without re-entering data.

### Phase E4 — Optional fidelity upgrade (P1)

- Sequential swarm passes: identities + Day 1 → feed forward to Day 14 → feed forward to Day 30 (15 calls instead of 7).
- Genuine state transitions and memory, still local, still dependency-free.
- Opt-in, because cost and latency roughly double.

## Deferred, with reasons

- **Zep Cloud**: persistent cross-run graph memory, but it sends seed material off-machine and requires an external key. Revisit only if cross-run memory becomes the core product.
- **OASIS engine**: real multi-agent interaction and emergent contagion, but it adds a Python service, hundreds of calls per run, and non-deterministic results. Revisit only if the goal changes from a validation workbench to a prediction platform.
- **Neither is required for accuracy in the sense that matters here**: observed weekly data is the ground truth; the engine is only the hypothesis generator.

## Guardrails

- Real evidence and synthetic output are never mixed visually or in prompts without an explicit label.
- The guide never predicts revenue from the ledger; it identifies assumptions and proposes tests.
- No claim of calibrated prediction, market proof, or investor interest, in the UI or in documentation.
- Weekly entries stay in the browser; they are not written into run files unless the founder explicitly includes them as seed material.
