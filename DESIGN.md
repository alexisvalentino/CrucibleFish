---
name: CrucibleFish
description: A white-and-blue floor directory for one guide and 100 temporal customer states.
colors:
  primary: "#155eef"
  primary-deep: "#0e4fc4"
  canvas: "#f5f8fc"
  paper: "#ffffff"
  ink: "#12233d"
  muted: "#596d85"
  line: "#d9e3ef"
  line-strong: "#b9cbe0"
  blue-soft: "#eaf1ff"
  success: "#19734f"
  caution: "#805500"
  danger: "#b13c46"
  info: "#0f6572"
typography:
  display:
    fontFamily: "Montserrat, Arial, sans-serif"
    fontSize: "25px"
    fontWeight: 700
    lineHeight: 1.28
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Montserrat, Arial, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0em"
  label:
    fontFamily: "Montserrat, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0em"
rounded:
  control: "6px"
  panel: "12px"
  round: "50%"
spacing:
  tight: "4px"
  control: "8px"
  group: "16px"
  section: "24px"
  wide: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
    height: "40px"
  input-default:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 11px"
    height: "42px"
  floor-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "11px 10px"
  status-node:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.round}"
    width: "44px"
    height: "44px"
---

## Overview

CrucibleFish uses an architectural floor directory to make temporal evidence readable beside a single persistent conversation. White working surfaces, a pale-blue canvas, navy text, and exact rules give it the density of a research instrument without imitating an elevator or a game controller. Blue identifies the active floor and primary action; customer colors are reserved for state.

**The Evidence-First Rule.** Density must come from actual customers, memories, scores, or state transitions, never decorative dashboard machinery.

## Colors

- **Action blue:** primary buttons, selected navigation, active floors, focus indicators, and linked evidence. Use the deeper blue on hover.
- **Working neutrals:** paper for the conversation and forms, canvas for analysis, ink for primary reading, muted text for secondary reading, and two line weights for structure.
- **State colors:** paying blue, saved teal, free-active amber, and churned gray-blue. Dots carry the hue; their labels use darker AA-compliant variants.
- **Semantic colors:** success for positive deltas, danger for founder-trap and error text, and pale blue notices for verification boundaries.

**The Active-Blue Rule.** Saturated blue always means an action or current state, not ambient decoration.

## Typography

Montserrat is self-hosted in regular, semibold, and bold weights under its OFL license. Display text is compact and architectural; body copy favors comfortable line length and line height over visual density.

- **Display:** guide-level conclusions and major transitions, semibold/bold with restrained negative tracking.
- **Body:** conversation and explanatory content at 13–13.5px in the built workbench.
- **Functional labels:** never below 11px. Tables, metadata, legends, and navigation share this floor.
- **Small-screen inputs:** 16px at 900px and below to avoid mobile focus zoom.

**The Readable-Density Rule.** Fit content through scrolling, wrapping, and pane changes rather than shrinking functional type.

## Layout

- **Wide desktop:** a 218px navigation rail, flexible conversation, and a minimum 490px simulation directory. The header is 64px.
- **Intermediate desktop:** navigation contracts to 190px and then a 74px icon rail while both work areas remain visible.
- **900px and below:** conversation and workbench become switchable full-width panes under a 60px header and 48px pane switch. Navigation opens as an inert-when-closed drawer.
- **Customer field:** ten columns where space permits, five columns with 44px nodes in the single-pane layout. Only one node enters the sequential Tab order; arrows move through the grid.
- **Vertical flow:** analysis panels own their scroll. Analysis/result changes reset to the top; floor and filter changes retain context and focus.

## Elevation & Depth

Structure comes primarily from one-pixel rules and tonal surfaces. Most working components have no shadow. Dialogs use neutral elevation without a border; toasts use a softer neutral shadow. Focus uses a blue outline or pale-blue ring, not a decorative glow.

**The Flat-at-Rest Rule.** Borders describe the workspace; elevation is reserved for temporary overlays and focus.

## Shapes

Controls use gently curved 6px corners. Larger composer, preview, and dialog surfaces use 12–14px corners. Customer nodes are circular. Pills are limited to compact suggestions and status metadata. The floor directory uses rectangular sign-like controls, while the cohort uses exact circles rather than illustrative avatars.

## Components

### Buttons

Primary buttons use action blue with white text and a 40px desktop height. Secondary buttons use paper, a defined border, and navy text. Hover moves a button up by at most 1px; active returns it to rest. Small-screen workflow actions reach 44px where space allows. Icon-only controls always retain accessible names and tooltips.

### Inputs / Fields

Fields use a white ground, strong neutral border, visible label, and helper text when recovery or provider behavior needs explanation. Focus changes the border to blue and adds a pale ring. Errors appear beside the affected form in pale red with a specific recovery action. Disabled controls remain legible and expose reduced opacity.

### Navigation

The selected analysis view uses a pale-blue ground and blue text. At 900px the drawer is inert and hidden from accessibility navigation while closed; its trigger exposes expanded state and controls. Dialogs restore focus to their invoker or its newly rendered equivalent.

### Temporal Floor Directory

Three floor buttons expose Day 1, Day 14, and Day 30 with retention values. The active floor is solid blue with full-opacity white secondary text. Floor transitions use a short clip-and-vertical movement; reduced-motion users receive a static change.

### Customer Grid

Every node is a real customer button with an accessible ID, name, and current-floor status. Roving tabindex and arrow/Home/End navigation provide one grid entry point. Enter opens cumulative evidence, and closing restores focus to the corresponding node.

### Conversation

Assistant messages use a small guide avatar and unboxed reading measure; user messages use a pale-blue bubble. The composer remains bounded at the bottom. Streaming indicators appear only during an actual response, and errors preserve the user's message history.

### Analysis Views

Feature triage and market data use ruled tables and expandable rationale rather than repeated metric cards. The data flywheel uses connected numbered stages because sequence carries meaning. Demo values and generated hypotheses are labelled beside the evidence.

## Do's and Don'ts

### Do:
- **Do** keep one guide, three meaningful temporal states, and a fixed customer-status legend across views.
- **Do** reset analysis scroll on view/result changes and preserve focus during floor/filter updates.
- **Do** use 44px customer targets in the single-pane layout and 16px small-screen input text.
- **Do** label synthetic evidence, illustrative demo values, and unverified market hypotheses at the point of reading.

### Don't:
- **Don't** shrink functional text below 11px or compress the two-pane layout below 900px.
- **Don't** add decorative card grids, gradient text, glyph icons, animated liveness, or elevator/game control costumes.
- **Don't** put all 100 customers in sequential keyboard navigation or leave a closed drawer focusable.
- **Don't** present simulated customers, market sizes, or investor matches as verified real-world proof.

