// Composites the owner's real plate photos into the two food scenes of the home page
// scroll-world, in the same frame the AI dioramas use: an 1800x1200 whitewash still. Each
// photo is cropped to the print window (756x556), set as a white-bordered print with a
// 3px ink frame and a soft cast shadow (the menu page's plate treatment), tilted a touch.
//
// Usage: node make-stills.js            then: node make-images.js  (og-menu + 1200/900 rungs)
//
//   site/images/dinner-plate.jpg  ->  site/world/plate.webp  (+ plate-1200.webp, plate-900.webp)
//   site/images/wings-plate.jpg   ->  site/world/wings.webp  (+ wings-1200.webp, wings-900.webp)
// wings-plate.jpg is only 563px wide (an Instagram export), so it is upscaled ~1.3x into the print;
// drop in the original photo at 1000px+ on the short side and re-run for a sharper still.
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

const SITE = path.join(__dirname, "site");
const W = 1800, H = 1200;
const data = (rel, mime) => `data:${mime};base64,` + fs.readFileSync(path.join(SITE, rel)).toString("base64");
// The wall grain from styles.css, a touch stronger so it survives WebP.
const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.07 0 0 0 0 0.07 0 0 0 0 0.06 0 0 0 0.12 0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23g)'/%3E%3C/svg%3E\")";

// focus: object-position for the 4:3 crop (keep the food, drop the tray/counter edges)
const SCENES = [
  { id: "plate", src: "images/dinner-plate.jpg", mime: "image/jpeg", focus: "50% 48%", tilt: -2.5 },
  { id: "wings", src: "images/wings-plate.jpg", mime: "image/jpeg", focus: "50% 55%", tilt: 2 },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  for (const s of SCENES) {
    await page.setContent(`<!doctype html><html><head><style>
      html,body{margin:0;width:${W}px;height:${H}px;background:#f6f4ee;overflow:hidden}
      .wall{position:absolute;inset:0;background-color:#f6f4ee;background-image:${GRAIN}}
      /* Centre the print right of middle and a touch high: on desktop the engine's copy column
         (left ~36% of the viewport) stays on bare wall, and on phones the cover crop still keeps
         most of the photo in the centre column with the copy over the print's lower border. */
      .print{position:absolute;left:62%;top:45%;width:800px;height:600px;transform:translate(-50%,-50%) rotate(${s.tilt}deg);
        background:#fff;padding:22px;box-sizing:border-box;border:3px solid #111;
        box-shadow:0 40px 70px -30px rgba(17,17,17,0.55), 0 12px 24px -14px rgba(17,17,17,0.35)}
      .print img{display:block;width:100%;height:100%;object-fit:cover;object-position:${s.focus}}
    </style></head><body><div class="wall"></div><div class="print"><img src="${data(s.src, s.mime)}"></div></body></html>`, { waitUntil: "load" });
    await page.evaluate(() => document.querySelector("img").decode());
    const png = await page.screenshot({ type: "png" });
    // Encode via canvas so we get WebP at the same quality rung as the other stills.
    await page.setContent(`<!doctype html><html><body><img src="data:image/png;base64,${png.toString("base64")}"></body></html>`, { waitUntil: "load" });
    for (const [w, out] of [[W, `world/${s.id}.webp`], [1200, `world/${s.id}-1200.webp`], [900, `world/${s.id}-900.webp`]]) {
      const dataUrl = await page.evaluate(async (w) => {
        const img = document.querySelector("img"); await img.decode();
        const h = Math.round(img.naturalHeight * (w / img.naturalWidth));
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        return c.toDataURL("image/webp", 0.82);
      }, w);
      fs.writeFileSync(path.join(SITE, out), Buffer.from(dataUrl.split(",")[1], "base64"));
      console.log("wrote", out, fs.statSync(path.join(SITE, out)).size, "bytes");
    }
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
