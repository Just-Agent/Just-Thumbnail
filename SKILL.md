---
name: just-thumbnail
description: Generate polished website thumbnails from URLs or screenshots, especially multi-device responsive preview images, Open Graph/social cards, square app/store thumbnails, and vertical story posters. Use when Codex needs to make a "Just-Thumbnail" image, website screenshot card, responsive device mockup, README hero preview, GitHub Pages thumbnail tool, or batch thumbnail assets for different platforms.
---

# Just Thumbnail

Create one thing well: a website thumbnail that looks useful across platforms.

## Workflow

1. Identify the source:
   - URL: use `scripts/just-thumbnail.mjs`.
   - Existing screenshot: use the Pages app in `docs/` or adapt the script's generated composite HTML pattern.
2. Choose presets:
   - `responsive`: desktop, laptop, tablet, and phone in one image.
   - `og`: 1200x630 social/Open Graph card.
   - `square`: 1080x1080 marketplace or avatar-style card.
   - `story`: 1080x1920 vertical mobile poster.
   - `all`: generate every preset.
3. Generate and inspect the PNGs. If a target blocks loading, say so plainly and use a local screenshot or authenticated browser session instead of pretending the thumbnail is complete.

## Quick Start

From this skill folder:

```powershell
npm install
npm link
thumb https://example.com
thumb https://example.com --preset responsive --devices desktop,tablet,phone
```

Outputs include captured viewport screenshots, generated thumbnails, and `manifest.json`.

Use `--devices` for the `responsive` preset when the user wants only certain device frames. Valid values are `desktop`, `laptop`, `tablet`, and `phone`; aliases include `pc`, `ipad`, `mobile`, and `iphone`.

## Quality Rules

- Keep the thumbnail about the site, not about the tool.
- Use real rendered screenshots when possible.
- Make the first image inspectable: no blurry crops, tiny unreadable text, or decorative filler.
- Prefer direct PNG export from Playwright for reliable assets.
- For a public GitHub Pages demo, keep it static and honest: URL previews depend on iframe/screen-capture browser support; direct server-grade URL rendering requires a backend or GitHub Action.

## Reference

Read `references/platform-presets.md` only when choosing a platform-specific size or explaining Pages limitations.
