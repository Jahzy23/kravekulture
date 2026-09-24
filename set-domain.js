#!/usr/bin/env node
// Move the site to a new host name. Usage: node set-domain.js kravekulture.com
//
// Rewrites the current absolute site URL everywhere it is hard-coded (canonical, og/twitter,
// JSON-LD generator, sitemap, robots, llms.txt, legal pages, QR page text, the GitHub Pages
// redirect shims), then regenerates the JSON-LD, the QR card and its PDF. README.md is left
// alone on purpose: it talks about the old host as history, edit it by hand.
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const host = (process.argv[2] || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) {
  console.error("Usage: node set-domain.js your-domain.com");
  process.exit(1);
}
const schema = fs.readFileSync("make-schema.js", "utf8");
const cur = schema.match(/SITE_URL = "https:\/\/([^"/]+)"/)[1];
if (cur === host) { console.log("Site already lives at", host); process.exit(0); }

const list = (dir, re) => fs.readdirSync(dir).filter((f) => re.test(f)).map((f) => path.join(dir, f));
const files = ["make-schema.js", ...list("site", /\.(html|xml|txt)$/), ...list("redirect", /\.html$/)];
let n = 0;
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  const t = s.split(cur).join(host);
  if (t !== s) { fs.writeFileSync(f, t); n++; console.log("updated", f); }
}
console.log(`${cur} -> ${host} in ${n} files`);
for (const [script, args] of [["make-schema.js", []], ["make-qr.js", [`https://${host}/menu.html`]], ["make-qr-pdf.js", []]]) {
  execFileSync("node", [script, ...args], { stdio: "inherit" });
}
console.log("\nNext: add", host, "to the Vercel project, point DNS at it, set", cur, "to redirect there, then commit and push.");
