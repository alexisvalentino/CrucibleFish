# CrucibleFish roadmap — simulation-first startup validation

## Product direction

Help founders pressure-test an idea before they commit time and money. The default run should work with a concise startup name, pitch, and target customer. It should show where simulated customers understand, adopt, reject, or struggle with the idea.

Every baseline keeps the idea unchanged across Day 1, Day 14, and Day 30. Future plans and suggested changes are optional. A founder can test one as a separate Day-30 scenario and compare it with the saved baseline, or ignore scenarios entirely.

## Current product

- A 100-customer simulation with temporal reactions, customer profiles, social threads, and a persistent guide.
- An unchanged baseline that does not depend on a roadmap, business model, pricing, or proposed pivot.
- Optional venture critique and market research views, clearly labelled as model-generated hypotheses.
- Optional Day-30 change scenarios that preserve the original baseline for comparison.
- Optional seed material to ground a run in context the founder already has.
- A local PDF report that summarizes a completed simulation without another model call.

## Next improvements

1. Make the baseline's assumptions and unknowns easy to inspect, especially when price, payer, geography, or feature details are absent.
2. Improve the clarity of simulated customer paths and show why each customer changed or kept their behavior over time.
3. Make optional scenario comparisons easy to understand without making a scenario feel required to finish a run.
4. Keep the app focused on fast idea validation; revisit adjacent workflows only when they directly improve that job.

## Parked

- Evidence Log and Calibration were removed from the current product scope. Revisit them only if founders ask for a recurring real-world measurement workflow.
- Sequential simulation passes may improve state continuity, but they add latency and provider cost; keep the current single-pass flow until that tradeoff is justified.
- External memory engines and large-scale agent worlds remain out of scope. They add services and complexity without making synthetic results equivalent to observed customer behavior.

## Guardrails

- Simulation output is a hypothesis, never real customer evidence, a revenue forecast, verified market sizing, or investor interest.
- Clearly label model-generated market research and illustrative demo values.
- Do not require a roadmap, change scenario, or real-world evidence log to validate an idea.
- A user-authored scenario must preserve the unchanged baseline for side-by-side comparison.
