#!/usr/bin/env node
/**
 * Krave Kulture QR generator.
 *
 * Usage:
 *   node make-qr.js https://your-site-url/menu.html
 *
 * Writes into ./site/qr/ (also served on the live site at /qr/):
 *   qr-menu.svg          plain vector QR (black on white, ECC level H)
 *   qr-menu-card.svg     print-ready branded card, text converted to paths (fully vector)
 *   qr-menu.png          2048px raster preview for quick sharing
 *
 * Re-run any time the URL changes (for example after you buy a domain).
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

const OUT = path.join(__dirname, "site", "qr");
fs.mkdirSync(OUT, { recursive: true });

// Brand tokens (mirrors site/styles.css)
const INK = "#111111";
const RED = "#C4261D";
const BLUE = "#18359C";
const GOLD = "#F2B632";
const WHITE = "#FFFFFF";

async function main() {
  // 1. Plain QR, ECC H so a printed sticker survives scuffs.
  const plain = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 4,
    color: { dark: INK, light: WHITE },
  });
  fs.writeFileSync(path.join(OUT, "qr-menu.svg"), plain);

  // 2. Raster preview.
  await QRCode.toFile(path.join(OUT, "qr-menu.png"), url, {
    errorCorrectionLevel: "H",
    margin: 4,
    width: 2048,
    color: { dark: INK, light: WHITE },
  });

  // 3. Branded print card. QR modules drawn as one path, text as glyph paths.
  const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const data = qr.modules.data;

  // Card geometry (mm-ish units; 1 unit = 1 px in the SVG viewBox).
  const W = 1000;
  const H = 1400;
  const qrSize = 720;
  const qrX = (W - qrSize) / 2;
  const qrY = 300;
  const cell = qrSize / n;

  let d = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (data[y * n + x]) {
        d += `M${(qrX + x * cell).toFixed(2)} ${(qrY + y * cell).toFixed(2)}h${cell.toFixed(2)}v${cell.toFixed(2)}h-${cell.toFixed(2)}z`;
      }
    }
  }

  const fontDir = path.join(__dirname, "tools", "fonts");
  const bungeePath = path.join(fontDir, "bungee-400.ttf");
  const bodyPath = path.join(fontDir, "big-shoulders-text-700.ttf");
  const bungee = fs.existsSync(bungeePath) ? opentype.loadSync(bungeePath) : null;
  const body = fs.existsSync(bodyPath) ? opentype.loadSync(bodyPath) : null;

  function textPath(font, text, cx, y, size, fill, tracking = 0) {
    if (!font) {
      // Fallback keeps the card usable even without the TTFs (text stays live text).
      return `<text x="${cx}" y="${y}" text-anchor="middle" font-family="Bungee, Impact, sans-serif" font-size="${size}" fill="${fill}">${text}</text>`;
    }
    const glyphs = font.stringToGlyphs(text);
    const scale = size / font.unitsPerEm;
    let width = 0;
    for (let i = 0; i < glyphs.length; i++) {
      width += glyphs[i].advanceWidth * scale + (i < glyphs.length - 1 ? tracking : 0);
    }
    let x = cx - width / 2;
    let out = "";
    for (let i = 0; i < glyphs.length; i++) {
      const g = glyphs[i];
      const p = g.getPath(x, y, size);
      out += p.toPathData(2);
      x += g.advanceWidth * scale + tracking;
    }
    return `<path d="${out}" fill="${fill}"/>`;
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <title>Krave Kulture — scan for menu and payment</title>
  <!-- Whitewash card -->
  <rect width="${W}" height="${H}" fill="#F6F4EE"/>
  <!-- Painted signboard: red field, blue band -->
  <rect x="0" y="0" width="${W}" height="220" fill="${RED}"/>
  <rect x="0" y="220" width="${W}" height="36" fill="${BLUE}"/>
  <rect x="0" y="256" width="${W}" height="10" fill="${GOLD}"/>
  ${textPath(bungee, "KRAVE KULTURE", W / 2, 150, 104, WHITE, 2)}
  <!-- QR plate -->
  <rect x="${qrX - 28}" y="${qrY - 28}" width="${qrSize + 56}" height="${qrSize + 56}" fill="${WHITE}" stroke="${INK}" stroke-width="6"/>
  <path d="${d}" fill="${INK}" shape-rendering="crispEdges"/>
  <!-- Instruction board -->
  <rect x="0" y="${H - 300}" width="${W}" height="300" fill="${INK}"/>
  ${textPath(bungee, "SCAN FOR MENU", W / 2, H - 190, 78, GOLD, 2)}
  ${textPath(bungee, "+ HOW TO PAY", W / 2, H - 100, 78, WHITE, 2)}
  ${textPath(body, url.replace(/^https?:\/\//, "").replace(/\/$/, ""), W / 2, H - 36, 34, "#BFBFBF", 1)}
</svg>
`;
  fs.writeFileSync(path.join(OUT, "qr-menu-card.svg"), svg);

  console.log("QR target:", url);
  console.log("Wrote:", fs.readdirSync(OUT).map((f) => path.join("site", "qr", f)).join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
