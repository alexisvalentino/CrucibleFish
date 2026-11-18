# CrucibleFish targeted finish verdict

- **Target:** http://localhost:4740/
- **Scope:** Only the six findings in `qa/2026-11-18-finish-review/REPORT.md`; no application source changed.
- **Environment:** Local Node app, agent-browser 0.39.1, session `cruciblefish-finish-verdict` (closed); shared dashboard left running.
- **Viewports checked live:** 768×1024, 820×1024, 900×1024, 400×844, 390×844, 320×720.
- **Verdict:** SHIP. All six findings are resolved in the scoped source and browser checks.

## Checks

| Check | Expected | Actual | Status |
|---|---|---|---|
| Contrast | Normal text meets 4.5:1 | Independently calculated paying 5.86, saved 6.31, free 6.13, churned 4.79, active-floor subtitle 5.41, post metadata 4.99:1. Live computed colors match the source overrides. | PASS |
| Tablet customer targets | Practical 44px nodes without horizontal overflow | Nodes are 44×44px at 768, 820, and 900; document and workbench widths equal the viewport. Also 44px with no overflow at 400, 390, and 320. | PASS |
| Closed drawer | Hidden from focus/accessibility navigation; trigger state exposed | Closed sidebar is inert with `aria-hidden=true`; menu has `aria-controls=sidebar` and `aria-expanded=false`. Open state removes inert, sets expanded=true, and focuses New simulation. Escape closes, makes sidebar inert, and returns focus to menu. | PASS |
| Floor and customer focus | Focus survives rerenders and dialog close | Day 1 click leaves focus on `data-floor=1`. Grid has exactly one tab stop. ArrowLeft/ArrowRight navigation leaves customer 2 focused with one tab stop. Closing customer 2's dialog returns focus to customer 2. | PASS |
| Analysis scroll | View changes start at top and focus title | Simulation at scrollTop 1087 (maximum) → Critique at 0 with `viewTitle` focused. Critique at 1337 (maximum) → Market at 0 with `viewTitle` focused. | PASS |
| Small-screen name and fields | Demo has a name; primary text fields are 16px | Demo accessible name is “Explore the PawsMatch demo” at 768 and visible/named at 400. Pivot is 16px. Dialog input/select are 16px at 768 and 320. At 320 the dialog client/scroll widths are both 287px and Save remains in bounds. | PASS |
| Design documentation | Required design record exists and is usable | DESIGN.md contains the operating layout, color, typography, navigation, grid, and scroll contracts. `.impeccable/design.json` parses successfully. | PASS |
| Automated checks | Existing tests and syntax checks pass | `npm test`: 19/19 pass, including two roving-grid tests. `npm run check`: pass. | PASS |
| Runtime health | No local request or console failure | All 13 observed local requests returned 200; console command reported no errors. | PASS |

No application failure reproduction steps remain open in this scope.

## Evidence inspected

- Original report and current `index.html`, `styles.css`, `app.js`, `views.mjs`, `grid.mjs`, `DESIGN.md`, `.impeccable/design.json`, and `app/scripts/ui-grid.test.mjs`.
- Supplied `tablet-fixed-768.png`, `desktop-final.png`, and `mobile-workbench-final.png` in `qa/2026-11-18-workbench/`.
- Fresh live capture: `qa/2026-11-18-finish-verdict/mobile-current-390.png`.
- The left-edge offset visible in the supplied mobile image did not reproduce: fresh 390px geometry has workbench client/scroll widths of 390/390, scrollLeft 0, and aligned header/content rectangles.
- Existing `qa/2026-11-18-workbench/flow.webm` decoded with FFmpeg exit 0. This establishes readability, not coverage of the fixes.

## Limitations / blocked evidence

- A new scoped recording was attempted at 10 fps, but `record stop` reported that the encoder fell more than 500ms behind. No WebM was created, so no new recording is claimed.
- Live OpenAI/KIE behavior was not tested because credentials were not supplied. Mocked/local automated tests do not establish provider response quality, portrait quality, entitlement, billing, or latency.
- No physical iOS/Android device or screen-reader run was performed. The 16px mobile fields are verified computed CSS, not a physical-device focus-zoom test.
- Broader workflows outside the six findings were not manually rerun in this focused verdict pass.
