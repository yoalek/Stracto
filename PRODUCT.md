# Product

## Register

product

## Users

Creators and AI-video operators (feeding Luma, Kling, Gen-3, Hedra) who reverse-engineer existing short-form videos (Facebook Reels, TikTok) into storyboards. They work locally on Mac/Linux/Windows, are comfortable installing CLI tooling (yt-dlp, ffmpeg), and speak Portuguese (pt-BR). Context: mid-workflow, iterating on content ideas, value speed and privacy.

## Product Purpose

Stracto turns any video URL into a frame-accurate storyboard chunked into 8-second windows (the standard generation length for AI video tools). It runs 100% locally — yt-dlp downloads, ffmpeg extracts, Whisper transcribes with exact timestamps, and the engine groups frames+text into 8s blocks. Success looks like: paste a link, watch the pipeline, get a usable storyboard with zero cloud fees and zero uploads.

## Brand Personality

Precise, technical, unpretentious. "Hacker tool with taste." Terminal-native honesty: the pipeline is the product and the UI surfaces it directly. Confidence without hype.

## Anti-references

- SaaS-cream dashboards with rounded gradient cards and marketing copy.
- Generic "AI startup" purple-blue gradients and glassmorphism used decoratively.
- Oversimplified "wizard" UIs that hide what the tool actually does.

## Design Principles

1. **The pipeline is the product.** Show the real work (download → audio → transcript → frames) as honest, live status — never fake or canned progress.
2. **Local-first is a feature.** Privacy and zero-cost are the value proposition; the UI should communicate "your data never leaves your machine."
3. **Paste → storyboard in seconds.** The primary loop must stay one step: paste a link, press one button.
4. **The 8-second window is the unit of truth.** Every block is a generation-ready asset; structure and copy should make that legible.

## Accessibility & Inclusion

- Portuguese (pt-BR) language throughout, including alt text and error messages.
- WCAG AA: text contrast ≥ 4.5:1, visible focus states, keyboard-complete flows.
- `prefers-reduced-motion` respected.
- Async pipeline states announced to screen readers (aria-live) — the terminal is the status channel.
