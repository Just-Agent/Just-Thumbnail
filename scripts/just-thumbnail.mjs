#!/usr/bin/env node
import { chromium } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const devices = {
  desktop: { label: "Desktop", width: 1440, height: 900, dpr: 1 },
  laptop: { label: "Laptop", width: 1280, height: 800, dpr: 1 },
  tablet: { label: "Tablet", width: 820, height: 1180, dpr: 1, isMobile: true },
  phone: { label: "Phone", width: 390, height: 844, dpr: 2, isMobile: true }
};

const presets = {
  responsive: { width: 1600, height: 960, file: "responsive.png" },
  og: { width: 1200, height: 630, file: "og.png" },
  square: { width: 1080, height: 1080, file: "square.png" },
  story: { width: 1080, height: 1920, file: "story.png" }
};

const args = parseArgs(process.argv.slice(2));
if (!args.url && args._.length > 0) {
  args.url = args._[0];
}

const requestedPreset = args.preset || "all";
const selectedPresets = requestedPreset === "all" ? Object.keys(presets) : [requestedPreset];
const responsiveDevices = parseDevices(args.devices || "desktop,laptop,tablet,phone");

if (!args.url || selectedPresets.some((preset) => !presets[preset])) {
  console.error("Usage: thumb <url|file> [--preset responsive|og|square|story|all] [--devices desktop,laptop,tablet,phone] [--out out/site] [--title Title]");
  process.exit(1);
}

const title = args.title || hostTitle(args.url);
const outDir = path.resolve(args.out || path.join("out", slugFor(args.url)));
const shotsDir = path.join(outDir, "captures");
const targetUrl = await normalizeUrl(args.url);
const manifest = {
  source: targetUrl,
  title,
  generatedAt: new Date().toISOString(),
  responsiveDevices,
  captures: {},
  thumbnails: {}
};

await fs.mkdir(shotsDir, { recursive: true });

const browser = await chromium.launch();
try {
  const captureDevices = requiredCaptureDevices(selectedPresets, responsiveDevices);
  const captures = await captureAll(browser, targetUrl, shotsDir, captureDevices);
  manifest.captures = Object.fromEntries(
    Object.entries(captures).map(([key, value]) => [key, path.relative(outDir, value.file)])
  );

  for (const preset of selectedPresets) {
    const spec = presets[preset];
    const file = path.join(outDir, spec.file);
    await renderComposite(browser, preset, spec, title, targetUrl, captures, file, responsiveDevices);
    manifest.thumbnails[preset] = path.relative(outDir, file);
  }

  await fs.writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Just Thumbnail generated ${selectedPresets.length} preset(s) in ${outDir}`);
  for (const preset of selectedPresets) {
    console.log(`${preset}: ${path.join(outDir, presets[preset].file)}`);
  }
} finally {
  await browser.close();
}

function parseArgs(argv) {
  const parsed = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      parsed._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else if (key === "devices") {
      const values = [];
      while (argv[index + 1] && !argv[index + 1].startsWith("--")) {
        values.push(argv[index + 1]);
        index += 1;
      }
      parsed[key] = values.join(",");
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function parseDevices(value) {
  const aliases = {
    pc: "desktop",
    desktop: "desktop",
    laptop: "laptop",
    notebook: "laptop",
    ipad: "tablet",
    tablet: "tablet",
    pad: "tablet",
    mobile: "phone",
    phone: "phone",
    iphone: "phone"
  };
  const names = String(value)
    .split(",")
    .map((item) => aliases[item.trim().toLowerCase()])
    .filter(Boolean);
  const unique = [...new Set(names)];
  return unique.length > 0 ? unique : ["desktop", "laptop", "tablet", "phone"];
}

function requiredCaptureDevices(selectedPresets, responsiveDevices) {
  const required = new Set();
  if (selectedPresets.includes("responsive")) {
    responsiveDevices.forEach((device) => required.add(device));
  }
  if (selectedPresets.includes("og")) required.add("desktop");
  if (selectedPresets.includes("square")) required.add("laptop");
  if (selectedPresets.includes("story")) required.add("phone");
  return [...required];
}

async function normalizeUrl(input) {
  if (/^https?:\/\//i.test(input) || /^file:\/\//i.test(input)) return input;

  const absolutePath = path.resolve(process.cwd(), input);
  try {
    await fs.access(absolutePath);
    return pathToFileURL(absolutePath).href;
  } catch {
    return `https://${input.replace(/^\/+/, "")}`;
  }
}

function hostTitle(input) {
  try {
    return new URL(input).hostname.replace(/^www\./, "");
  } catch {
    return "Just Thumbnail";
  }
}

function slugFor(input) {
  const raw = hostTitle(input) || "thumbnail";
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "thumbnail";
}

async function captureAll(browser, url, shotsDir, deviceNames) {
  const result = {};
  for (const key of deviceNames) {
    const device = devices[key];
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.dpr,
      isMobile: Boolean(device.isMobile)
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => document.fonts?.ready).catch(() => {});

    const file = path.join(shotsDir, `${key}.png`);
    await page.screenshot({ path: file, fullPage: false, type: "png" });
    const data = await fs.readFile(file);
    result[key] = {
      ...device,
      file,
      src: `data:image/png;base64,${data.toString("base64")}`
    };
    await context.close();
  }
  return result;
}

async function renderComposite(browser, preset, spec, title, source, captures, file, responsiveDeviceNames) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const page = await browser.newPage({ viewport: { width: spec.width, height: spec.height }, deviceScaleFactor: 1 });
  await page.setContent(compositeHtml(preset, spec, title, source, captures, responsiveDeviceNames), { waitUntil: "load" });
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.screenshot({ path: file, fullPage: false, type: "png" });
  await page.close();
}

function compositeHtml(preset, spec, title, source, captures, responsiveDeviceNames) {
  const safeTitle = escapeHtml(title);
  const safeSource = escapeHtml(cleanSource(source));
  const body = (() => {
    if (preset === "responsive") return responsiveBody(safeTitle, safeSource, captures, responsiveDeviceNames);
    if (preset === "og") return cardBody("og", safeTitle, safeSource, captures.desktop.src);
    if (preset === "square") return cardBody("square", safeTitle, safeSource, captures.laptop.src);
    if (preset === "story") return cardBody("story", safeTitle, safeSource, captures.phone.src);
    throw new Error(`Unsupported preset: ${preset}`);
  })();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    width: ${spec.width}px;
    height: ${spec.height}px;
    overflow: hidden;
    background: #eef3f8;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #10213d;
  }
  .stage {
    position: relative;
    width: ${spec.width}px;
    height: ${spec.height}px;
    overflow: hidden;
    background:
      radial-gradient(circle at 28% 18%, rgba(35, 178, 109, 0.18), transparent 30%),
      radial-gradient(circle at 82% 18%, rgba(25, 135, 212, 0.16), transparent 32%),
      linear-gradient(180deg, #f8fbff 0%, #e8eef5 100%);
  }
  .brand {
    position: absolute;
    left: 56px;
    top: 42px;
    display: flex;
    align-items: center;
    gap: 12px;
    color: #173a68;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 0;
  }
  .brand::before {
    content: "";
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: #23b26d;
    box-shadow: 0 0 0 6px rgba(35, 178, 109, 0.12);
  }
  .title {
    position: absolute;
    left: 56px;
    top: 86px;
    width: 520px;
    margin: 0;
    color: #0c2345;
    font-size: 54px;
    line-height: 1;
    letter-spacing: 0;
  }
  .source {
    position: absolute;
    left: 58px;
    top: 210px;
    max-width: 460px;
    color: #5a6b82;
    font-size: 18px;
    font-weight: 650;
    letter-spacing: 0;
  }
  .device {
    position: absolute;
    background: #0b1018;
    box-shadow: 0 36px 90px rgba(18, 31, 50, 0.26);
  }
  .screen {
    position: absolute;
    inset: 13px;
    overflow: hidden;
    background: #fff;
  }
  .screen img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
    object-position: top center;
    background: #fff;
  }
  .desktop {
    left: 650px;
    top: 145px;
    width: 650px;
    height: 420px;
    border-radius: 18px;
  }
  .desktop::after {
    content: "";
    position: absolute;
    left: 255px;
    top: 420px;
    width: 140px;
    height: 118px;
    background: linear-gradient(180deg, #dfe5ec, #aab4c0);
    clip-path: polygon(32% 0, 68% 0, 92% 100%, 8% 100%);
  }
  .desktop::before {
    content: "";
    position: absolute;
    left: 200px;
    top: 532px;
    width: 250px;
    height: 18px;
    border-radius: 999px;
    background: linear-gradient(90deg, transparent, rgba(80, 93, 110, 0.5), transparent);
    filter: blur(2px);
  }
  .laptop {
    left: 955px;
    top: 635px;
    width: 400px;
    height: 254px;
    border-radius: 13px;
  }
  .laptop::after {
    content: "";
    position: absolute;
    left: -36px;
    right: -36px;
    bottom: -18px;
    height: 18px;
    border-radius: 0 0 28px 28px;
    background: linear-gradient(180deg, #dce3ec, #98a4b2);
  }
  .tablet {
    left: 390px;
    top: 635px;
    width: 350px;
    height: 260px;
    border-radius: 20px;
  }
  .phone {
    left: 775px;
    top: 645px;
    width: 142px;
    height: 252px;
    border-radius: 25px;
  }
  .phone .screen {
    inset: 11px 8px;
    border-radius: 18px;
  }
  .card {
    position: absolute;
    overflow: hidden;
    border: 1px solid rgba(142, 157, 176, 0.3);
    background: #fff;
    box-shadow: 0 36px 90px rgba(18, 31, 50, 0.18);
  }
  .card img {
    position: absolute;
    object-fit: contain;
    object-position: top center;
    background: #fff;
  }
  .og-card {
    left: 515px;
    top: 72px;
    width: 610px;
    height: 486px;
    border-radius: 34px;
  }
  .og-card img {
    left: 26px;
    top: 26px;
    width: 558px;
    height: 316px;
    border-radius: 18px;
  }
  .og-card h1 {
    position: absolute;
    left: 36px;
    right: 36px;
    top: 358px;
    margin: 0;
    font-size: 42px;
    line-height: 1;
    letter-spacing: 0;
  }
  .og-card p {
    position: absolute;
    left: 38px;
    bottom: 30px;
    margin: 0;
    color: #5c6b7f;
    font-size: 20px;
    font-weight: 650;
  }
  .square-card {
    left: 110px;
    top: 110px;
    width: 860px;
    height: 860px;
    border-radius: 48px;
  }
  .square-card img {
    left: 46px;
    top: 220px;
    width: 768px;
    height: 480px;
    border-radius: 28px;
    box-shadow: 0 24px 70px rgba(18, 31, 50, 0.16);
  }
  .square-card h1 {
    position: absolute;
    left: 52px;
    right: 52px;
    top: 52px;
    margin: 0;
    font-size: 64px;
    line-height: 1;
    letter-spacing: 0;
  }
  .square-card p {
    position: absolute;
    left: 56px;
    bottom: 62px;
    margin: 0;
    color: #5c6b7f;
    font-size: 26px;
    font-weight: 650;
  }
  .story-card {
    left: 92px;
    top: 120px;
    width: 896px;
    height: 1680px;
    border-radius: 60px;
  }
  .story-card img {
    left: 96px;
    top: 450px;
    width: 704px;
    height: 1040px;
    border-radius: 44px;
    box-shadow: 0 28px 90px rgba(18, 31, 50, 0.2);
  }
  .story-card h1 {
    position: absolute;
    left: 78px;
    right: 78px;
    top: 78px;
    margin: 0;
    font-size: 92px;
    line-height: 0.95;
    letter-spacing: 0;
  }
  .story-card p {
    position: absolute;
    left: 84px;
    right: 84px;
    top: 300px;
    margin: 0;
    color: #5c6b7f;
    font-size: 34px;
    line-height: 1.25;
    font-weight: 650;
  }
</style>
</head>
<body>${body}</body>
</html>`;
}

function responsiveBody(title, source, captures, deviceNames) {
  const placements = responsivePlacements(deviceNames);
  return `<main class="stage">
  <div class="brand">JUST-THUMBNAIL</div>
  <h1 class="title">${title}</h1>
  <div class="source">${source}</div>
  ${placements.map((placement) => device(placement.name, captures[placement.name].src, placement)).join("\n  ")}
</main>`;
}

function device(name, src, placement) {
  const style = placement
    ? ` style="left:${placement.left}px;top:${placement.top}px;width:${placement.width}px;height:${placement.height}px;"`
    : "";
  return `<section class="device ${name}"${style} aria-label="${name} preview"><div class="screen"><img src="${src}" alt=""></div></section>`;
}

function responsivePlacements(deviceNames) {
  const dims = {
    desktop: { width: 650, height: 420 },
    laptop: { width: 400, height: 254 },
    tablet: { width: 350, height: 260 },
    phone: { width: 142, height: 252 }
  };
  const names = deviceNames.filter((name) => dims[name]);
  const all = {
    desktop: { left: 650, top: 145 },
    tablet: { left: 390, top: 635 },
    phone: { left: 775, top: 645 },
    laptop: { left: 955, top: 635 }
  };
  if (names.length === 4) return names.map((name) => ({ name, ...dims[name], ...all[name] }));

  const single = {
    desktop: { left: 700, top: 285 },
    laptop: { left: 760, top: 380 },
    tablet: { left: 790, top: 360 },
    phone: { left: 895, top: 365 }
  };
  if (names.length === 1) {
    const name = names[0];
    return [{ name, ...dims[name], ...single[name] }];
  }

  const hasDesktop = names.includes("desktop");
  if (names.length === 2 && hasDesktop) {
    const other = names.find((name) => name !== "desktop");
    return [
      { name: "desktop", ...dims.desktop, left: 690, top: 165 },
      { name: other, ...dims[other], left: other === "phone" ? 910 : 835, top: 620 }
    ];
  }
  if (names.length === 3 && hasDesktop) {
    const others = names.filter((name) => name !== "desktop");
    return [
      { name: "desktop", ...dims.desktop, left: 690, top: 135 },
      { name: others[0], ...dims[others[0]], left: others[0] === "phone" ? 670 : 525, top: 635 },
      { name: others[1], ...dims[others[1]], left: others[1] === "phone" ? 900 : 920, top: 635 }
    ];
  }

  const rowStart = names.length === 2 ? 610 : 430;
  const gap = names.length === 2 ? 90 : 55;
  let cursor = rowStart;
  return names.map((name) => {
    const placement = { name, ...dims[name], left: cursor, top: name === "phone" ? 380 : 360 };
    cursor += dims[name].width + gap;
    return placement;
  });
}

function cardBody(kind, title, source, src) {
  return `<main class="stage">
  <div class="brand">JUST-THUMBNAIL</div>
  <section class="card ${kind}-card">
    <img src="${src}" alt="">
    <h1>${title}</h1>
    <p>${source}</p>
  </section>
</main>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cleanSource(source) {
  try {
    const url = new URL(source);
    return url.protocol === "file:" ? path.basename(url.pathname) : url.hostname.replace(/^www\./, "");
  } catch {
    return source;
  }
}
