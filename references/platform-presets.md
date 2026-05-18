# Platform Presets

Use these presets unless the user asks for a specific size.

| Preset | Size | Use |
| --- | ---: | --- |
| `responsive` | 1600x960 | Multi-device website thumbnail, README hero, product showcase. |
| `og` | 1200x630 | Open Graph, Twitter/X summary card, link preview. |
| `square` | 1080x1080 | App marketplace card, avatar-like thumbnail, social square post. |
| `story` | 1080x1920 | Mobile story poster, short-form vertical preview. |

Static GitHub Pages cannot run Chromium or bypass cross-origin screenshot restrictions. For real URL-to-PNG output, use Playwright locally, a serverless renderer, or a GitHub Action. A static page can still preview iframe-friendly sites, compose uploaded screenshots, and export browser-captured pixels after user consent.
