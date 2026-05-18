# Just Thumbnail

Just Thumbnail generates one useful thing: polished website thumbnails for responsive previews, social cards, square marketplace images, and vertical posters.

## Use the skill

```powershell
npm install
npm run thumbnail -- --url https://example.com --preset all --out out/example --title "Example"
```

The Playwright script writes viewport captures, PNG thumbnails, and a manifest.

## Web demo

`docs/` is a static GitHub Pages demo. It can compose uploaded screenshots directly in the browser. URL preview mode uses iframes and browser tab capture, so blocked sites still need the Playwright skill or a backend renderer.

## Presets

- `responsive`: desktop, laptop, tablet, phone.
- `og`: 1200x630 Open Graph/social preview.
- `square`: 1080x1080 app/store card.
- `story`: 1080x1920 vertical poster.
