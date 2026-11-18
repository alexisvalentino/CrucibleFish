# CrucibleFish QA report

- **Target:** http://localhost:4740
- **Scope:** demo boot, guide chat, floors, filters, customer evidence, critique/market views, interventions, reset, settings, character editing, intake, keyboard accessibility, contrast, and responsive layout
- **Environment:** Windows, Node 24.21, headless Chromium via agent-browser 0.39.1; sessions `cruciblefish-qa`, `cruciblefish-finish-review`, and `cruciblefish-finish-verdict` (all closed)
- **Provider boundary:** no live OpenAI/KIE calls; automated provider boundaries were mocked
- **Final independent verdict:** **SHIP**, all six findings from the initial finish review resolved (`qa/2026-11-18-finish-verdict/REPORT.md`)

## Outcomes

| Check | Expected and observed result | Status |
|---|---|---|
| Demo boot | 100 uniquely named customer buttons; initial guide and Day-14 floor render | PASS |
| Floors and social evidence | Day 1, Day 14, and Day 30 change actual customer states and corresponding threads | PASS |
| Filters | B2B archetype shows 10 customers; adding Day-14 churned status shows 8 | PASS |
| Customer evidence and guide | Customer #42 opens three memories; Ask the guide closes the drawer and answers with that profile | PASS |
| Custom intervention | Favorable clinic-paid/free intervention changes Day 30 to 78% active with 22 churners; Day 14 remains 24% | PASS |
| Demo reset | Explore demo restores 71% Day-30 baseline, no pivot history, and one initial guide message | PASS |
| Critique and market | Feature triage, flywheel, roadmap, 16 reality nodes plus header, market metrics, and VC research render | PASS |
| Settings | Missing keys produce inline recovery errors; custom model/base persist; no test keys sent to a real provider | PASS |
| Character | Rename updates the guide; KIE generation without a key produces an actionable error | PASS |
| Intake | Preset loads exactly 8 current + 4 planned features; live run without a key remains in the dialog with an error | PASS |
| Responsive geometry | 1440, 1024, 768, 820, 900, 390, and 320px checked without horizontal document overflow; single-pane targets are 44px | PASS |
| Contrast | Legend labels measure 5.86, 6.31, 6.13, and 4.79:1; active-floor subtitle 5.41:1; post metadata 4.99:1 | PASS |
| Keyboard | Closed sidebar is inert; menu exposes expanded state; floor focus survives; one grid tab stop; arrows navigate; dialog focus returns | PASS |
| Analysis scroll/focus | Critique and Market open at scrollTop 0 with `viewTitle` focused after lower-page navigation | PASS |
| Small-screen controls | Demo has a persistent accessible name; pivot and dialog inputs compute to 16px | PASS |
| Automated suite | `npm test`: **19/19 passed**; `npm run check` and direct module syntax checks passed | PASS |
| Runtime requests | Final observed local resource requests returned 200; no console errors | PASS |
| Primary recording | `flow.webm` is 9,257,416 bytes and decodes end-to-end with FFmpeg exit code 0 | PASS |

## Initial findings and fixes

1. `.mjs` was served as `application/octet-stream`, blocking the frontend. Added a failing MIME test and corrected the mapping; all modules now load.
2. A favorable demo intervention reached an unrealistic 98% active. Added persistent-skeptic coverage; it now reaches 78% with 22 churners.
3. Explore demo reloaded mutated state. Added `/api/demo/reset` and regression coverage.
4. Functional text was below 11px and several labels missed AA contrast. Raised type/contrast and verified measured ratios.
5. The 761–900px layout crushed targets; closed navigation and rerenders lost focus; analysis retained stale scroll. Added the 900px single-pane layout, inert navigation, roving grid, focus restoration, and scroll resets.
6. The design-system record was missing. Added `DESIGN.md` and `.impeccable/design.json`.

## Evidence

- Video: `qa/2026-11-18-workbench/flow.webm`
- Desktop: `qa/2026-11-18-workbench/desktop-final.png`
- Fixed tablet: `qa/2026-11-18-workbench/tablet-fixed-768.png`
- Mobile: `qa/2026-11-18-workbench/mobile-workbench-final.png` and `mobile-chat.png`
- Other viewports: `tablet-1024.png`, `mobile-workbench.png`
- Initial review: `qa/2026-11-18-finish-review/REPORT.md`
- Final verdict: `qa/2026-11-18-finish-verdict/REPORT.md`
- Server logs: `server.log`, `server-error.log`

## Limitations and blocked checks

- **Live OpenAI/OpenAI-compatible behavior and KIE portrait generation: BLOCKED** without user credentials. Model entitlement, custom-provider quirks, response/portrait quality, billing, and latency remain unverified.
- **Fix-pass video: BLOCKED.** The recorder exceeded its 500ms encoder-lag threshold and saved no WebM. Only the primary recording is claimed. Live checks, screenshots, computed geometry, and independent review cover the fixes.
- **Physical devices and assistive technology:** not run. Mobile CSS and keyboard behavior were checked in Chromium, not with a physical iOS/Android device or a screen reader.
- **Design-taste marketing gate:** reported 42 FAIL findings oriented toward landing pages (hero fill, marketing CTA, photography, one-section-per-screen, generic containers). These were not treated as applicable product requirements. Its relevant menu/off-viewport findings were fixed and independently verified; the gate was not rerun and is not claimed as passing.
- The generic fresh-context Cline reviewer was used because the named Impeccable reviewer/documenter agent types were not exposed. The final reviewer independently ran browser checks and scored all six fixes resolved.
