#!/usr/bin/env node
/**
 * Krave Kulture QR generator. Makes ONE file:
 *
 *   site/qr/krave-kulture-qr.svg
 *
 * A print-ready vector card: the QR code (error correction level H, so a
 * scuffed sticker still scans) on a painted Krave Kulture signboard, with
 * every letter converted to vector paths (no fonts needed at the print shop).
 *
 * Usage:
 *   node make-qr.js https://your-site-url/menu.html
 *
 * Re-run any time the URL changes (for example after you buy a domain),
 * then commit and push. The card is also served at /qr/ on the live site.
 */
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const opentype = require("opentype.js");

const url = process.argv[2];
if (!url || !/^https?:\/\//.test(url)) {
  console.error("Usage: node make-qr.js https://your-site-url/menu.html");
  process.exit(1);
}

const OUT_DIR = path.join(__dirname, "site", "qr");
const OUT = path.join(OUT_DIR, "krave-kulture-qr.svg");
fs.mkdirSync(OUT_DIR, { recursive: true });

// Brand tokens (mirror site/styles.css)
const INK = "#111111";
const RED = "#C4261D";
const RED_DEEP = "#9E1D16";
const BLUE = "#18359C";
const GOLD = "#F2B632";
const WHITE = "#FFFFFF";
const WHITEWASH = "#F6F4EE";

function loadFont(file) {
  const p = path.join(__dirname, "tools", "fonts", file);
  if (!fs.existsSync(p)) throw new Error("Missing font file: " + p);
  const buf = fs.readFileSync(p);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

const bungee = loadFont("bungee-400.ttf");
const body = loadFont("big-shoulders-text-700.ttf");

/** Text as a single vector path, centered on cx with baseline y. */
function textPath(font, text, cx, y, size, fill, tracking = 0) {
  const glyphs = font.stringToGlyphs(text);
  const scale = size / font.unitsPerEm;
  let width = 0;
  glyphs.forEach((g, i) => {
    width += g.advanceWidth * scale + (i < glyphs.length - 1 ? tracking : 0);
  });
  let x = cx - width / 2;
  let d = "";
  glyphs.forEach((g) => {
    d += g.getPath(x, y, size).toPathData(2);
    x += g.advanceWidth * scale + tracking;
  });
  return `<path d="${d}" fill="${fill}"/>`;
}

/** Bungee lettering with the sign-painter block shade used on the site. */
function painted(text, cx, y, size, face, shade, tracking = 0) {
  const step = size * 0.01;
  let out = "";
  for (let i = 8; i >= 1; i--) {
    out += textPath(bungee, text, cx + step * i, y + step * i, size, shade, tracking);
  }
  return out + textPath(bungee, text, cx, y, size, face, tracking);
}

const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
const n = qr.modules.size;
const data = qr.modules.data;

// Card geometry (1 unit = 1px in the viewBox; prints at any size).
const W = 1000;
const H = 1400;
const qrSize = 700;
const qrX = (W - qrSize) / 2;
const qrY = 330;
const cell = qrSize / n;

let modules = "";
for (let y = 0; y < n; y++) {
  for (let x = 0; x < n; x++) {
    if (data[y * n + x]) {
      modules += `M${(qrX + x * cell).toFixed(2)} ${(qrY + y * cell).toFixed(2)}h${cell.toFixed(2)}v${cell.toFixed(2)}h-${cell.toFixed(2)}z`;
    }
  }
}

const shownUrl = url.replace(/^https?:\/\//, "").replace(/\/$/, "");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <title>Krave Kulture: scan for menu and how to pay</title>
  <desc>QR code pointing to ${url}</desc>
  <rect width="${W}" height="${H}" fill="${WHITEWASH}"/>
  <rect x="0" y="0" width="${W}" height="236" fill="${RED}"/>
  <rect x="0" y="230" width="${W}" height="6" fill="${RED_DEEP}"/>
  <rect x="0" y="236" width="${W}" height="44" fill="${BLUE}"/>
  <rect x="0" y="280" width="${W}" height="10" fill="${GOLD}"/>
  ${painted("KRAVE KULTURE", W / 2, 158, 104, WHITE, BLUE, 2)}
  ${textPath(body, "HAITIAN  ·  CARIBBEAN  ·  SOUL FOOD  ·  MIAMI, FL", W / 2, 268, 26, WHITE, 2)}
  <rect x="${qrX - 26}" y="${qrY - 26}" width="${qrSize + 52}" height="${qrSize + 52}" fill="${WHITE}" stroke="${INK}" stroke-width="6"/>
  <path d="${modules}" fill="${INK}" shape-rendering="crispEdges"/>
  <rect x="0" y="${H - 290}" width="${W}" height="290" fill="${INK}"/>
  <rect x="0" y="${H - 290}" width="${W}" height="10" fill="${GOLD}"/>
  ${painted("SCAN FOR MENU", W / 2, H - 178, 80, GOLD, RED_DEEP, 2)}
  ${painted("+ HOW TO PAY", W / 2, H - 92, 80, WHITE, BLUE, 2)}
  ${textPath(body, shownUrl, W / 2, H - 30, 30, "#BFBFBF", 1)}
</svg>
`;

if (/<text[\s>]/.test(svg)) throw new Error("Live <text> element found; lettering must be paths.");
fs.writeFileSync(OUT, svg);
console.log("QR target:", url);
console.log("Wrote:", path.relative(__dirname, OUT));
