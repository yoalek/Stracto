---
target: Stracto UI (public/index.html + styles.css + app.js)
total_score: 22
p0_count: 0
p1_count: 4
timestamp: 2026-07-31T21-01-47Z
slug: public-index-html
---
# Stracto UI — Design Critique

**Target**: `public/index.html` (+ `public/styles.css`, `public/app.js`) — AI Storyboarder tool. Register: **product**.
**State under review**: Post-"Choice 3" — collapsible storyboard blocks implemented, static example blocks removed. Initial load = Hero + Terminal/Storyboard area.
**Server**: `localhost:3001` serving the exact files reviewed.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Real pipeline logs are excellent; but pre-seeded fake rows lie about status on load |
| 2 | Match System / Real World | 3 | Strong domain language ("blocos de 8 segundos", storyboard); terminal metaphor fits the audience |
| 3 | User Control and Freedom | 2 | No cancel for running jobs; no collapse-all; dead "Ajuda" link |
| 4 | Consistency and Standards | 2 | `alert()` vs terminal for errors; inline onclick vs addEventListener; gear icon duplicates Configurações link |
| 5 | Error Prevention | 2 | Empty-URL guard exists but is a jarring native alert; no URL format validation |
| 6 | Recognition Rather Than Recall | 3 | All actions visible; block titles carry time ranges; no recent/history |
| 7 | Flexibility and Efficiency | 1 | No shortcuts, no collapse-all, no per-block copy/export — gap for the actual user job |
| 8 | Aesthetic and Minimalist Design | 3 | Cohesive dark terminal aesthetic; noise from fake terminal rows + duplicate nav affordance |
| 9 | Error Recovery | 2 | Errors land in terminal in plain pt-BR, but raw server messages leak; no retry affordance |
| 10 | Help and Documentation | 1 | "Ajuda" is `href="#"`; no tooltips, no in-app help, README not linked |
| **Total** | | **22/40** | **Acceptable** |

## Anti-Patterns Verdict

**LLM assessment**: This does NOT read as AI slop. The dark terminal-native aesthetic is coherent and the JetBrains Mono + Inter pairing is a deliberate dev-tool voice, not a default. The single orange accent is disciplined. The strongest slop-adjacent tells are: the terminal pre-seeded with fake in-progress rows (the "make it look busy" move), and emoji/unicode glyphs (✳ ▼ ⚙ ⌛) instead of a real icon set. In the product register the bar is "would a fluent user of Linear/Notion trust it" — yes for the hero and terminal, no for the a11y/interaction gaps.

**Deterministic scan** (`detect.mjs --json public/index.html`): 2 findings, both in the font family:
- `overused-font` (Inter) — **valid**. Inter is the most saturated AI default. Mitigated here by the JetBrains Mono pairing and terminal motif, so it's a "renovate, don't redo" item.
- `single-font` — **false positive**. The page loads both Inter AND JetBrains Mono; the detector only matched the Inter family string. JetBrains Mono is genuinely used for timestamps/durations/badges.

**Visual overlays**: Browser injection unavailable in this session (no live browser tooling); the live page at `localhost:3001` was fetched and matches the reviewed source exactly. Findings are source-verified with exact contrast math.

## Overall Impression

The core concept is strong and the Choice-3 collapsible blocks are the right scalability decision: the collapsed summary (time range + duration + chevron) is exactly what a creator scanning 20 blocks needs. The hero-to-terminal flow is confident and the real-time pipeline log is a genuine differentiator. But the *initial* state — the thing a first-time user sees — currently lies: the terminal shows "Conectando ao vídeo… 45%…" before any job exists. The single biggest opportunity is making the empty state honest and teachable (terminal = "waiting for your link", not "job already running"), then closing the accessibility gaps in the new collapsible interaction.

## What's Working

1. **The terminal-as-status is a real design win.** Timestamps, live log lines, the pulsing dot, and progress rows give the pipeline the honest, technical voice the brand promises. When a real job runs, this is excellent status communication.
2. **Collapsible blocks done visually right.** Full-header hit area, rotating chevron, and a clean collapsed summary (title + duration). `prefers-reduced-motion` is globally respected.
3. **Restrained, confident palette.** One accent color, disciplined surfaces, strong hero hierarchy, pt-BR language, and aria-labels on icon buttons. The 58px hero with the inline accent glyph has genuine personality.

## Priority Issues

1. **[P1] Initial state lies: terminal is pre-seeded with fake progress rows**
   - **Why**: The user asked "is the empty state clear?" — today it shows "Conectando ao vídeo… / Baixando vídeo… 45% / Transcrevendo com IA…" before any job exists. First-time users will believe a job is running (or already ran), and may wait, refresh, or assume the app is stuck. When the real job starts, `terminal.innerHTML = ''` wipes the fake rows, so the UI visibly jumps.
   - **Fix**: Replace the seeded rows with an honest terminal empty state — e.g. a single muted line like `[standby] cole um link acima para começar` — or hide the terminal until the first submit. Keep a *visually distinct* "example" only if you want to teach the pipeline, but never style it as live status.
   - **Command**: `/impeccable onboard`
2. **[P1] Collapsible blocks are not keyboard- or screen-reader accessible**
   - **Why**: The toggle is a `<div onclick>` — not focusable, no `role="button"`, no `aria-expanded`, no `aria-controls`. Keyboard users and screen readers cannot collapse blocks at all, and the "▼" glyph is read aloud as "black down-pointing triangle". This is the new headline feature; it ships inaccessible.
   - **Fix**: Render block headers as `<button>` (or add `role="button"`, `tabindex="0"`, `aria-expanded`, `aria-controls`, Enter/Space handling), mark the chevron `aria-hidden="true"`, and add a `:focus-visible` style. Prefer event delegation over inline `onclick` in the generated HTML.
   - **Command**: `/impeccable audit` then `/impeccable polish`
3. **[P1] Mobile topbar overflows at phone widths; touch targets undersized**
   - **Why**: At 375px, brand (~110px) + 3 nav links + gear icon (~260px incl. 18px gaps) ≈ 370px + 40px padding ≈ 410px > viewport. `body { overflow-x: hidden }` masks the overflow instead of fixing it. The 34px gear button, 13px nav links, and ~24px block-header hit area all fall below the 44px touch-target floor.
   - **Fix**: At ≤640px, drop nav links into a compact layout (hide labels, keep gear; or wrap) and give block headers ≥44px hit height (`min-height: 44px` on `.block-header`). Remove reliance on `overflow-x: hidden`.
   - **Command**: `/impeccable adapt`
4. **[P1] Terminal never announces to assistive tech; async flow is silent**
   - **Why**: The user flagged aria-live — confirmed absent. The `.terminal` section has `aria-label` but no `aria-live`/`role="log"`, so every live log line, the completion message, and the storyboard appearing are invisible to screen readers. The "Processando…" button state change is also unannounced.
   - **Fix**: Add `role="log" aria-live="polite"` to the terminal (the semantic match for streaming console output). Announce completion via the log and move focus to the storyboard header (or add `tabindex="-1"` + `.focus()`).
   - **Command**: `/impeccable audit`
5. **[P2] Contrast failures on core text: placeholder, secondary text, CTA**
   - **Why**: Measured ratios — placeholder `#5c5c5c` on panel: **2.82:1**; `--text-faint` on bg: **2.96:1** (used for timestamps, brand-sub, chevron); white on accent CTA: **3.69:1** (15px/600 is not "large text", so 4.5:1 required). All fail WCAG AA; the placeholder and timestamps are the worst offenders because they're the most-read text.
   - **Fix**: Lift `--text-faint` to ≥ `#6e6e6e` (4.5:1), darken the CTA background (`#c94213`-ish) or lighten button text to hit 4.5:1, and raise placeholder to the same tier.
   - **Command**: `/impeccable audit`

## Persona Red Flags

**Alex (Power User)** — No keyboard shortcuts anywhere; no collapse-all / expand-all for a 15-block storyboard (one click per block); no cancel for a job that can run minutes (model download, transcription); no copy/export of a block's text or frames — yet "feeding AI generators" is the README's stated use case, so Alex must screenshot to get content out. High friction for the primary output workflow.

**Sam (Accessibility-Dependent)** — Cannot collapse blocks (div onclick, unfocusable). Hears the "▼" triangle announced but nothing when the pipeline updates (no aria-live). Placeholder text and timestamps are below contrast. Focus indicators are weak (`border-color` #3a3a3a vs #262626 on focus — barely perceptible). Frame alt text is in English on a pt-BR page.

**Casey (Distracted Mobile)** — Topbar overflows at 375px; gear button is 34px; nav links are 13px text with no padding; block header is a ~24px tap target. If interrupted mid-job, there is no way to resume or reconnect to the running job (SSE jobId is lost on refresh).

## Minor Observations

- `alert('Insira o link do vídeo!')` is a jarring native dialog in an otherwise polished dark UI — use inline validation.
- Frame alt text `"Frame at {start}"` is English; page is pt-BR → `"Frame em 3.2s"`.
- `.t-dot` has a glow but **no animation** — it never pulses. The "live" feel comes only from new rows; a subtle CSS pulse would sell it (respect reduced-motion).
- The gear icon and the "Configurações" nav link are duplicates — pick one affordance.
- "Dashboard" is the active nav item but there is no dashboard — misleading active state.
- Raw server error strings (`e.message` from yt-dlp/ffmpeg) can leak into the terminal — wrap in friendly pt-BR copy.
- `storyboard` section uses `display:none` — no "what will appear here" placeholder before first run.

## Questions to Consider

- What if the terminal's pre-run state *taught* the pipeline instead of faking it — a labeled "exemplo" strip, visually distinct from live logs?
- Does this tool need a cancel/abort affordance as much as it needs a start button?
- What would a confident version of this look like with a real icon set instead of unicode glyphs?
- Should collapsed blocks show a thumbnail strip so a collapsed storyboard still gives an at-a-glance scan?
