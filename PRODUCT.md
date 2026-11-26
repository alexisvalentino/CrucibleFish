# CrucibleFish product truth

## Product
CrucibleFish is a simulation-first startup validator. One persistent, user-created AI guide fronts a simulation of 100 heterogeneous customers and a venture critique. Founders can describe an idea with minimal required input, inspect the customer reactions across three time floors, and optionally test a future product or pricing change.

The core workflow is an unchanged baseline: Day-1 discovery, Day-14 friction, and Day-30 continued use of the idea as described. A suggested or user-authored change never affects that baseline; founders may run it as a separate Day-30 scenario. The guide is the only conversational persona; the 100 customers are simulation subjects, not 100 separate chat characters.

## Origin

Built from a network of builders who use AI heavily and wanted a deliberate check on that habit. MiroFish inspired the swarm mechanics; this product keeps them local and inspectable. Human discernment is the decision-maker; the simulation is a stress test, not an authority.

## Primary user and job
A founder or product operator is deciding what to build, remove, automate, or charge for before committing more implementation time. They need a fast, critical, inspectable hypothesis test rather than an AI-generated affirmation. Simulation outputs are directional synthetic evidence, never claimed as real customer research or market proof.

## Required workflows
- Create and edit one guide: name, role, and personality, shown with a simple initial-letter avatar.
- Configure an OpenAI API key, model, and optional OpenAI-compatible custom base URL from the browser; server environment variables are also supported.
- Load the PawsMatch case study or enter the required startup name, pitch, and target customer. Geography, business model, pricing, traction, features, future plans, and seed material are optional. Website auto-fill uses public metadata and does not overwrite existing input.
- Run the live pipeline: ontology plus venture critic, then customer batches sized by `SWARM_BATCH_SIZE` (default five batches of 20) with concurrency limited by `SWARM_CONCURRENCY`.
- Inspect all 100 customers across Day 1, Day 14, and Day 30, with filters, social threads, episodic memories, and baseline telemetry.
- Inspect feature triage, the four-stage data flywheel, a 90-day plan, market estimates, and VC matches.
- Export a readable report for a completed run as a PDF using the browser's print-to-PDF flow; build it deterministically from the saved result without another provider call, label synthetic hypotheses, and omit raw seed-material text.
- Stream a conversation with the single guide and ask about selected customers or results.
- Optionally test a suggested or custom future change by re-simulating only Day 30 while preserving the baseline, Day 1, Day 14, and customer identities.
- Present social threads as clearly labelled seed evidence with round labels, channel filters, and links from influenced customers to their actual Day-14 actions.
- Evidence Log and Calibration workflows are currently removed from the product scope. Optional seed material can still be supplied directly to a run.
- Start empty: no simulated data is loaded until the founder runs a simulation or explicitly opens the clearly labelled illustrative PawsMatch demo, which needs no API keys or paid calls.

## Constraints and trust boundaries
- White-and-blue visual theme, with Revalida's calm workbench density and ChatGPT-style conversation as references rather than screens to copy.
- API keys are sent only to the local Node server over same-origin requests. They are never written into simulation files or returned by configuration APIs. Browser persistence must be an explicit user choice; `.env` remains private.
- Live market figures and VC matches are model-generated hypotheses and must be labelled for independent verification. Demo numbers are illustrative and must not be presented as measured traction.
- A baseline always represents the idea as described. Only Round-3 fields may change in an optional scenario; customer IDs, demographics, Round 1, and Round 2 remain immutable.
- No paid provider calls during automated tests. External calls occur only when the user configures credentials and starts the relevant workflow.

## Platform
Responsive web application, desktop-first for dense comparison work and fully usable on mobile. The server binds to localhost by default.

## Stack
User-confirmed Revalida-style dependency-free implementation: Node.js 20+ built-in HTTP/fetch/test modules, vanilla HTML/CSS/JavaScript, and no frontend framework or package installation. Start with `npm start`; test with `npm test`. Default local URL: `http://localhost:4740`.

## Completion evidence
Mocked provider and simulation tests, HTTP workflow checks, a production syntax check, and real-browser verification at desktop and mobile sizes. Live OpenAI quality and billing cannot be verified without the user's credentials; demo and mocked paths must not be described as live-provider verification.
