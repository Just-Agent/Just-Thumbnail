<div align="center">

# Just Thumbnail

Generate beautiful website thumbnails for responsive previews, Open Graph cards, square covers, and vertical story posters.

[![Deploy Pages](https://github.com/Just-Agent/Just-Thumbnail/actions/workflows/pages.yml/badge.svg)](https://github.com/Just-Agent/Just-Thumbnail/actions/workflows/pages.yml)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-2ea44f)](https://just-agent.github.io/Just-Thumbnail/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Built with Playwright](https://img.shields.io/badge/render-Playwright-45ba63)](https://playwright.dev/)

[Live Demo](https://just-agent.github.io/Just-Thumbnail/) · [Skill](SKILL.md) · [CLI Script](scripts/just-thumbnail.mjs)

<img src="docs/readme-assets/responsive.png" alt="Just Thumbnail responsive multi-device preview" width="920" />

</div>

## What It Does

Just Thumbnail turns one URL or screenshot into platform-ready preview images. Use the web page when you want a quick visual composer, and use the local CLI when you want reliable URL-to-PNG output without browser share dialogs.

| Preset | Output | Best for |
| --- | --- | --- |
| `responsive` | `1600x960` | README hero, product showcase, multi-device website preview |
| `og` | `1200x630` | Open Graph, Twitter/X card, link preview |
| `square` | `1080x1080` | App store cover, social post, marketplace thumbnail |
| `story` | `1080x1920` | Vertical poster, mobile story, short-form preview |

## Preview Gallery

Responsive thumbnails can show all devices or only the devices you choose.

<p align="center">
  <img src="docs/readme-assets/custom-responsive.png" alt="Custom responsive thumbnail showing only iPad and Phone" width="720" />
</p>

<p align="center">
  <img src="docs/readme-assets/og.png" alt="Open Graph preview" width="48%" />
  <img src="docs/readme-assets/square.png" alt="Square thumbnail preview" width="48%" />
</p>

<p align="center">
  <img src="docs/readme-assets/story.png" alt="Vertical story thumbnail preview" width="360" />
</p>

## Quick Start

```bash
git clone https://github.com/Just-Agent/Just-Thumbnail.git
cd Just-Thumbnail
npm install
npm link
thumb https://example.com
```

By default `thumb <url>` generates every preset into `out/<site>/`:

```text
out/example/
  responsive.png
  og.png
  square.png
  story.png
  captures/
  manifest.json
```

Generate only one preset:

```bash
thumb https://example.com --preset og --out out/example-og --title "Example"
```

Choose which devices appear in the responsive thumbnail:

```bash
thumb https://example.com --preset responsive --devices desktop,tablet,phone
thumb https://example.com --preset responsive --devices tablet,phone
thumb https://example.com --preset responsive --devices phone
```

Device aliases also work: `pc`, `ipad`, `mobile`, and `iphone`.

## Web Demo

The static demo is available at:

https://just-agent.github.io/Just-Thumbnail/

The browser version supports two modes:

| Mode | How to export |
| --- | --- |
| Upload screenshot | Choose an image, pick a preset, click `Export PNG`. This exports directly. |
| URL preview | Click `Export PNG`, choose the current Just Thumbnail tab in Chrome's share dialog, click `Share`, keep the tab visible for one second. |

When `Responsive` is selected, use the device checkboxes to choose Desktop, Laptop, iPad, Phone, or any smaller combination.

> For fully automatic URL-to-PNG generation, prefer the CLI: `thumb https://example.com`.

## Codex Skill

This repository is also a Codex skill. Install or link this folder into your Codex skills directory, then ask Codex for website thumbnails from a URL or screenshot.

```text
just-thumbnail/
  SKILL.md
  scripts/just-thumbnail.mjs
  docs/
```

Example prompt:

```text
Use just-thumbnail to generate responsive and Open Graph thumbnails for https://example.com.
```

## Notes

- The CLI uses Playwright, so it captures real rendered pages at desktop, laptop, tablet, and phone viewports.
- `responsive` supports custom device combinations with `--devices`.
- If a website is not responsive, the mobile/tablet thumbnails will show that real layout behavior.
- Static GitHub Pages cannot run a backend browser renderer or bypass cross-origin rules; that is why the web demo uses iframe preview, screenshot upload, or Chrome tab capture.
- Some sites block iframe display. Use the CLI for those sites.

## License

MIT
