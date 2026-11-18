# CrucibleFish finish review

- **Target:** http://localhost:4740/
- **Mode:** source/screenshot audit plus focused real-browser verification; no application source changed
- **Session:** `cruciblefish-finish-review` (closed); dashboard left running
- **Viewports:** 1440×900, 768×1024, 400×844, 390×844, 320×720
- **Provider boundary:** no live OpenAI/KIE calls attempted or verified; credentials were not supplied

## Verdict

**FIX.** Strong direction and product coverage, but normal-text contrast, tablet target sizing, and keyboard/focus continuity need release fixes. No rebuild or visual redirection is warranted.

## Checks

| Check | Expected / actual | Status |
|---|---|---|
| Direction and first viewport | Persistent guide/chat, floor directory, 100 customers, and white/blue operational world are present | PASS |
| Customer field | 100 buttons with ID, name, and status in accessible names | PASS |
| Mobile geometry | 320px document/workbench widths remain 320px; mobile nodes are 44×44px | PASS |
| Tablet targets | At 768×1024, nodes compute to 17×17px with 6px gaps (23px center spacing) | FAIL |
| Closed navigation | At 768px, Tab focuses `newSimulationBtn` at x=-221 while closed; trigger lacks `aria-expanded` | FAIL |
| Floor focus | Day 1 renders, but focus becomes `BODY` | FAIL |
| Persona focus | Dialog opens/closes, but close leaves focus on `BODY` because the invoker was replaced | FAIL |
| View navigation | Critique opens at the flywheel after lower-simulation reading; second reproduction opens Market at scrollTop 1419 with its first section above the viewport | FAIL |
| Contrast | Legend labels measure 4.31, 3.96, 4.05, and 2.78:1; active floor subtitle 4.15:1; post metadata about 4.45:1 | FAIL |
| Responsive names | At 400px, the visible icon-only demo button has no accessible name | FAIL |
| Mobile fields | Chat input is 16px, but pivot is 11px and dialog fields 11.5px | FAIL (computed style; iOS not device-tested) |
| New simulation at 320px | 287px dialog client/scroll widths match; Run action remains in bounds | PASS |
| Final local reload | All 12 HAR requests returned 200; no browser console errors reported | PASS |
| Automated checks | `npm test`: 17/17 pass; `npm run check`: pass | PASS |

## Material findings

### P1 — Contrast remediation is incomplete

**Locations:** `app/public/styles.css:8-9`; `app/public/views.mjs:29-30`.

On `#f5f8fc`, paying `#2c72df` is 4.31:1, saved `#16879b` 3.96:1, free `#a56f00` 4.05:1, and churned `#8798aa` 2.78:1. Active-floor small text uses white at opacity .82 over `#155eef`, producing about 4.15:1. Social metadata `#61758c` on canvas is about 4.45:1. These are 11px labels, not large text. Keep state hues in dots if desired, but use accessible text colors and full-opacity active-floor text.

### P1 — The 761–900px composition crushes the customer field

**Locations:** `app/public/styles.css:8,13,15-16`.

The two-pane layout remains until 760px. At 768px the workbench is 400px wide, leaving 17×17px customer buttons. With 6px gaps, adjacent centers are 23px apart, so the WCAG 2.5.8 spacing exception does not rescue these undersized targets. Move the switchable-pane composition to a wider breakpoint or otherwise preserve practical target dimensions; do not shrink text or nodes further.

### P1 — Keyboard focus and hidden navigation are not release-safe

**Locations:** `app/public/app.js:56-68,199-205,251,276-289`; `app/public/styles.css:15`; `app/public/index.html:31,38-43`; `app/public/views.mjs:46-53`.

The transformed-offscreen sidebar remains in sequential focus order. The menu trigger lacks `aria-expanded`/`aria-controls` and does not update its state. Whole-workbench `innerHTML` replacement removes focused floor/filter/channel controls. Persona opening also rerenders the invoking customer node, preventing native dialog focus restoration. All 100 customers are separate Tab stops with no bypass or roving-grid model, putting social evidence and the pivot up to 100 Tab presses away.

Make closed navigation inert/hidden, expose trigger state, manage drawer focus, preserve or restore focus after workbench updates, and provide a grid bypass or roving tabindex.

### P2 — Analysis views inherit stale scroll positions

**Locations:** `app/public/app.js:56-63,282`.

`renderWorkbench()` replaces content without resetting `#workbenchContent.scrollTop` on view changes. Reproduction 1: after reading the lower simulation on mobile, Critique opened at the data-to-AI flywheel rather than its diagnosis. Reproduction 2: Market opened at `scrollTop=1419` (its maximum), with the first section entirely above the viewport. Reset scroll on view/result transitions while preserving it for appropriate floor/filter updates.

### P2 — Small-screen control finish has two concrete gaps

**Locations:** `app/public/index.html:33`; `app/public/styles.css:9,11,15-17`.

From 391–900px, CSS hides the demo button's only text and the button has no `aria-label`; the accessibility snapshot exposes an unnamed button. The mobile pivot textarea remains 11px and dialog inputs 11.5px. Only chat receives 16px mobile input styling, leaving iOS focus-zoom risk in other primary workflows. Give the demo button a persistent accessible name and apply 16px mobile input/textarea/select styling across workflows. Actual iOS behavior was not device-tested.

### P3 — The direction contract's documentation finish is incomplete

**Location:** `.impeccable/surfaces/app-public-index-html.md:18` requires `DESIGN.md`; no such file exists. Add the design-system record. The KIE output directory already documents prompt-provenance sidecars, and Montserrat includes its OFL license; no missing raster provenance is claimed.

## Accepted deviations and detector triage

- Montserrat is retained as requested and locally hosted with its license.
- Typing dots only during real streaming is correct and avoids fake progress.
- Code-first implementation without an image comp is appropriate for this operational UI.
- Marketing-page detector complaints about a hero, photographs, one-section-per-screen, or filling conversational whitespace are inapplicable. Screen-reader-only form labels are valid, and the chat composer has a visible parent `:focus-within` treatment; those complaints are not product defects.
- The wide desktop simulation rail is accepted as a functional adjustment that keeps the floor directory and ten-column field legible.

## Evidence

- `tablet-current.png` — current 768px render and compressed field
- `mobile-critique-320.png` — stale-scroll Critique landing state
- `mobile-lower-workbench.png` — lower mobile customer/social layout
- `mobile-pivot.png` — mobile intervention form
- `network.har` — final reload's 12 successful local requests
- Supplied screenshots reviewed: `desktop-final.png`, `mobile-workbench-final.png`, `tablet-768.png`, and `tablet-1024.png` in `qa/2026-11-18-workbench/`

## Limitations and untested areas

- Live OpenAI/OpenAI-compatible responses, KIE portrait quality, entitlement, billing, and latency remain unverified.
- The broader supplied outcomes (filters/counts, pivot immutability/churn retention, reset, persistence, rename, and preset features) were reviewed against source/tests but not all repeated in this focused pass.
- No physical iOS/Android device or screen-reader run was performed.
- The scoped WebM recording failed because its encoder fell more than 500ms behind; no review recording exists. Findings rely on live outcome checks, computed geometry, source, HAR, and screenshots.
- No new regression suite was created; the existing 17-test suite was run.
