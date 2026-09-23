// Derived images for the site, rendered with the same Chromium make-qr-pdf.js uses.
// Usage: node make-images.js
//
//   site/images/og-home.jpg   1200x630 JPEG crop of world/truck.webp  (og:image, home)
//   site/images/og-menu.jpg   1200x630 JPEG crop of world/plate.webp  (og:image, menu)
//   site/world/<scene>-1200.webp  1200-wide rung between the 900 and 1800 stills, so a
//                             3x phone (~390 CSS px) gets ~1170 device px instead of 1800
//
// Social scrapers want a landscape JPEG/PNG at 1200x630; WebP support there is patchy
// and the square logo was being served as a "large image" card. Re-run after replacing
// any of the source stills.
const fs = require("fs");
const path = require("path");

const PW = [
  "playwright-core",
  "playwright",
  path.join(process.env.APPDATA || "", "npm/node_modules/@playwright/cli/node_modules/playwright-core"),
];
let chromium;
for (const p of PW) { try { ({ chromium } = require(p)); break; } catch (_) {} }
if (!chromium) { console.error("playwright-core not found"); process.exit(1); }

const ROOT = __dirname;
const SITE = path.join(ROOT, "site");
// Inline as data: URLs — a setContent() page is about:blank and may not read file://.
const fileUrl = (rel) => "data:image/webp;base64," + fs.readFileSync(path.join(SITE, rel)).toString("base64");

const OG = [
  { src: "world/truck.webp", out: "images/og-home.jpg" },
  { src: "world/plate.webp", out: "images/og-menu.jpg" },
];
const SCENES = ["market", "kitchen", "truck", "plate", "wings", "finale"];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const { src, out } of OG) {
    await page.setViewportSize({ width: 1200, height: 630 });
    await page.setContent(`<!doctype html><html><head><style>
      html,body{margin:0;background:#f6f4ee}
      img{display:block;width:1200px;height:630px;object-fit:cover;object-position:center 46%}
    </style></head><body><img src="${fileUrl(src)}"></body></html>`, { waitUntil: "load" });
    await page.evaluate(() => document.querySelector("img").decode());
    await page.screenshot({ path: path.join(SITE, out), type: "jpeg", quality: 82, fullPage: false });
    console.log("wrote", out, fs.statSync(path.join(SITE, out)).size, "bytes");
  }

  for (const id of SCENES) {
    const src = `world/${id}.webp`;
    const out = `world/${id}-1200.webp`;
    await page.setContent(`<!doctype html><html><body><img src="${fileUrl(src)}"></body></html>`, { waitUntil: "load" });
    const dataUrl = await page.evaluate(async () => {
      const img = document.querySelector("img");
      await img.decode();
      const w = 1200, h = Math.round(img.naturalHeight * (1200 / img.naturalWidth));
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      return c.toDataURL("image/webp", 0.82);
    });
    const buf = Buffer.from(dataUrl.split(",")[1], "base64");
    fs.writeFileSync(path.join(SITE, out), buf);
    console.log("wrote", out, buf.length, "bytes");
  }

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
