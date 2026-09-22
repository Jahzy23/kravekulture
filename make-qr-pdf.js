// Print-ready vector PDF of the QR card, rendered from site/qr/krave-kulture-qr.svg.
// Usage: node make-qr-pdf.js
// Needs Chromium via playwright-core (the global @playwright/cli install works).
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

const SVG = path.join(__dirname, "site/qr/krave-kulture-qr.svg");
const PDF = path.join(__dirname, "site/qr/krave-kulture-qr.pdf");
const svg = fs.readFileSync(SVG, "utf8");
// Card is 1000 x 1400 CSS px. Print at 5 x 7 in (200 px/in), a standard flyer/postcard size.
const W_IN = 5, H_IN = 7;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: ${W_IN}in ${H_IN}in; margin: 0; }
    html, body { margin: 0; padding: 0; background: #F6F4EE; }
    svg { display: block; width: ${W_IN}in; height: ${H_IN}in; }
  </style></head><body>${svg.replace(/^<\?xml[^>]*>\s*/, "")}</body></html>`, { waitUntil: "load" });
  await page.pdf({ path: PDF, width: `${W_IN}in`, height: `${H_IN}in`, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await browser.close();
  const buf = fs.readFileSync(PDF);
  const images = (buf.toString("latin1").match(/\/Subtype\s*\/Image/g) || []).length;
  console.log(`wrote ${path.relative(__dirname, PDF)} ${buf.length} bytes, ${W_IN}x${H_IN} in, raster images inside: ${images}`);
  if (images) { console.error("PDF contains raster images; expected pure vector"); process.exit(2); }
})().catch(e => { console.error(e); process.exit(1); });
