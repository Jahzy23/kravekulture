# Krave Kulture — site, menu and QR code

Static site for the Krave Kulture food truck (Miami, FL). No build step. Online pickup ordering runs on two small Vercel functions in `site/api/` with an Upstash Redis store.

## Folders

- `site/` — the website. Deploy this folder as-is.
  - `index.html` old scroll-scene home page, **switched off since October 27, 2026**: `/` and `/index.html` redirect to `menu.html` (see `redirects` in `vercel.json`); delete those two redirects to bring it back
  - `menu.html` menu + find the truck (the QR code points here)
  - `menu-data.js` **the only file you edit** to change dishes, prices, city, phone
  - `qr.html` print page for the QR card
  - `order.html` + `order.js` order ahead for pickup, paid online up front (see "Online ordering" below)
  - `track.html` + `track.js` customers find a lost order by name + last 4 digits of their phone
  - `admin.html` + `admin.js` password-protected order board; `order.css` styles both
  - `api/` Vercel serverless functions behind ordering (`orders.js`, `track.js`, `admin.js`, helpers in `api/_lib/`)
  - `terms.html`, `privacy.html` legal pages (see below)
  - `styles.css`, `app.js`, `fonts/`, `images/`
  - `vercel.json` — security headers + `cleanUrls: false` for the live Vercel deployment
- `redirect/` — deployed to GitHub Pages only, forwards the old `jahzy23.github.io/kravekulture` URLs to the live Vercel site
- `set-domain.js` — moves the site to a new host name: rewrites every absolute URL, then regenerates the JSON-LD and the QR card (`node set-domain.js eatkravekulture.com`)
- `make-qr.js` — generates the QR code (one vector SVG card) for any URL
- `make-qr-pdf.js` — renders that card as a print-ready vector PDF
- `make-stills.js` — composites the two real plate photos (`images/dinner-plate.jpg`, `images/wings-plate.jpg`) into the home page's plate and wings scene stills (`site/world/plate.webp`, `wings.webp` + 900 rungs); run `node make-images.js` after it
- `make-images.js` — renders the social preview images (`site/images/og-*.jpg`) and the 1200px scene stills (`site/world/*-1200.webp`) from the full-size stills
- `site/qr/` — generated QR files (also served on the live site at `/qr/` and shown on `/qr.html`)
- `tools/fonts/` — TTF copies of the display fonts used to draw text into the QR card
- `make-schema.js` — generates the `FoodEstablishment`/`Menu` JSON-LD from `menu-data.js` and writes it into `site/index.html` and `site/menu.html`
- `site/sitemap.xml`, `site/robots.txt`, `site/llms.txt`, `site/404.html` — discovery files; edit `sitemap.xml`'s `<lastmod>` when you change the menu

## Edit the menu

Open `site/menu-data.js`. Change names, prices, flavors, this week's spot, city or phone. Save. Redeploy.

- Set `SPOT` to this week's spot: `where`, `when`, and today's date in `updated`, exactly `YYYY-MM-DD` (`2026-10-06`; any other format hides it). It shows under Find the Truck on the menu page and in the truck scene on the home page for 7 days after that date, whatever `when` says, then hides itself and both pages go back to pointing at Instagram. If the plan changes or the spot ends early, change or clear `where` and redeploy. Paste a Google Maps share link (`https://...`) into `mapUrl` to get a Map link.
- `phone` in `LOCATION` (currently `786-999-4019`) powers the **Call us** button under Find the Truck and the `telephone` field in the JSON-LD. The number is never printed on the page, only in the `tel:` link. Leave it empty to hide the button.
- Online orders are paid up front through Square (card, Apple Pay, Google Pay). There is no pay-at-the-truck option online.
- Set `MENU_STATUS` to `"draft"` if you ever want a SAMPLE MENU tape across the top.
- After editing prices, dishes or the phone number, run `node make-schema.js` so the structured data search engines read matches the real data.
- The home page copy in `site/world/home.js` is hand-written and mentions a few prices and counts ("7 dinners", "From $20", "From $12"). It is not generated from `menu-data.js`, so check it after a price change.
- A section with no `items` is skipped (no crash), on the page and in the JSON-LD.

## Online ordering

Customers order on `order.html` for **pickup only** and **pay online up front** through Square (card, Apple Pay or Google Pay). The order is saved only after Square confirms the payment, so unpaid or declined orders never reach the board, the alerts, the emails or `track.html`. If the `SQUARE_*` env vars are missing, online ordering stays closed. Each order gets a random 4-digit order number shown on screen. Orders land on `admin.html`, where you sign in with the admin password, see open orders (oldest first, refreshed every 15 seconds with a beep for new ones), tap **Mark complete**, and flip the **Taking orders** switch. The switch starts **off**: while it is off the order page says online ordering is closed, and the "Order ahead" links on the menu page stay hidden.

After ordering, the confirmation screen shows the order number and a live status (Received → Done, checked every 30 seconds), tells the customer to screenshot it, and is remembered on that phone for 24 hours. Customers can also leave an email address (optional) and get the order number by email: `site/api/_lib/email.js` sends it through Resend from `orders@eatkravekulture.com` using the `RESEND_API_KEY` env var (a send-only key for the domain). The sending domain's DNS records (DKIM TXT at `resend._domainkey`, MX + SPF TXT at `send`, CNAME at `rsend`) live at Porkbun. If the key is missing or Resend is down, the order still goes through, just without the email. Anyone who loses the number can get it back on `track.html` with their name (first name is enough) and the last 4 digits of the phone they ordered with; it shows orders from the last 36 hours. On `admin.html` the search box finds orders by name, phone digits or order number across all tabs.

Prices and items come from `menu-data.js`, the same file as the menu, and the server re-prices every order from it, so editing the menu updates ordering too. An item is orderable when its `price` is a number and its `tag` is not `"sold out"`; a section with `choices` (wings) makes the customer pick one. Orders are kept 60 days, then deleted automatically.

One-time setup in Vercel (project `kravekulture`):

1. **Storage → Create Database → Upstash (Redis)**, free plan, connect it to the `kravekulture` project for all environments. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
2. **Settings → Environment Variables → add `ADMIN_PASSWORD`** (at least 8 characters, Production + Preview). Changing it later signs every device out.
3. **Redeploy** (Deployments → latest → Redeploy) so the functions pick up the variables.
4. Open `https://eatkravekulture.com/admin.html`, sign in, turn on **Taking orders**.

Until steps 1 and 2 are done, the order page simply says online ordering isn't open, and the rest of the site works as before. Abuse limits: 8 orders per 15 minutes per IP, 20 of any one item, 10 admin password tries per 15 minutes per IP, plus a hidden honeypot field.

To test locally without Vercel, point `KV_REST_API_URL`/`KV_REST_API_TOKEN` at an Upstash database (or any Upstash-REST-compatible mock) and run the functions with `vercel dev`.

## Regenerate the QR code

```bash
npm install
node make-qr.js https://YOUR-SITE-URL/menu.html
```

Writes one file, `site/qr/krave-kulture-qr.svg`: the QR code on a painted Krave Kulture card (lettering: "Scan for menu + today's spot"), all lettering converted to vector paths, with the full 4-module quiet zone the QR spec asks for (the ink frame sits outside it). Print it at any size.

Then run `node make-qr-pdf.js` to render the same card as a print-ready vector PDF at 5 × 7 in (`site/qr/krave-kulture-qr.pdf`). It uses Chromium through `playwright-core`; the global `@playwright/cli` install is enough. `node make-images.js` uses the same Chromium to rebuild the social preview JPEGs and the 1200px stills; run it if you replace anything in `site/world/`.

## Structured data (SEO)

`site/index.html` and `site/menu.html` each carry a `FoodEstablishment` JSON-LD block generated by `make-schema.js`, plus `menu.html` carries a full `Menu`/`MenuSection`/`MenuItem` block. Both live between `<!-- SCHEMA:START -->` / `<!-- SCHEMA:END -->` markers — never hand-edit inside those markers, they get overwritten.

```bash
node make-schema.js
```

Re-run it after any `menu-data.js` change (new dish, new price, new section). The `#faq` block on `menu.html` has its own hand-written `FAQPage` JSON-LD right below the markers; if you change the visible FAQ text, update that script tag to match.

Update the `<lastmod>` dates in `site/sitemap.xml` at the same time.

## Deploy

The live site is **https://eatkravekulture.com**, hosted on **Vercel** (project `kravekulture`, team `305`), git-linked to this repo with root directory `site/` — every push to `main` auto-deploys, no GitHub Actions involved. The domain is registered at Porkbun, which also hosts its DNS; the records that make it work are:

| Type | Host | Value | Why |
| --- | --- | --- | --- |
| A | `@` | `76.76.21.21` | apex → Vercel |
| A | `www` | `76.76.21.21` | www → Vercel, then redirected to the apex in the Vercel dashboard (`vercel domains inspect` recommends an A record here, not a CNAME) |
| TXT | `@` | `v=spf1 -all` | the domain sends no email; tells receivers to reject anything claiming to |
| TXT | `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s` | same, for DMARC-checking receivers |
| TXT | `@` | `google-site-verification=…` | proves ownership of the Google Search Console *domain* property; deleting it un-verifies the property |

`kravekulture.vercel.app` (the project's default URL, and what the first batch of QR cards point at) is set to redirect to the custom domain in the Vercel dashboard (Project → Settings → Domains → Edit on the `.vercel.app` entry), so old links keep working. Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, per-page `Content-Security-Policy`) and the cache rules for fonts, images, scene stills and QR files are set in `site/vercel.json`; GitHub Pages does not support custom response headers at all, which is why the site moved off it. Two quirks worth knowing: `/index.html` 308-redirects to `/` (one URL for the home page, and it is `/` that carries the CSP header), and a real 404 is served without the `/404.html` header rule, so the 404 page relies on its own `<meta http-equiv="Content-Security-Policy">` — every page carries that meta tag as a fallback anyway.

`jahzy23.github.io/kravekulture` (the old host) is kept alive on purpose: GitHub Actions (`.github/workflows/pages.yml`) now deploys the tiny `redirect/` folder there instead of `site/`, so any already-printed QR code or old bookmark still lands on the real site — deep links included, the 404 shim carries the path across. The workflow only runs when `redirect/` or the workflow file itself changes, and its actions are pinned to commit SHAs (the tag is in the trailing comment; bump both together). Never point that workflow back at `site/`.

Vercel Web Analytics is on (enabled in the project dashboard). Each page loads `/_vercel/insights/script.js`, which Vercel serves on the live domain; on a local server that URL 404s, which is expected and harmless. No npm package is needed for a static site, so `@vercel/analytics` is deliberately not a dependency.

If the host name ever changes again, run `node set-domain.js new-domain.com`: it rewrites every absolute URL (`make-schema.js`, `site/*.html` canonical/og/twitter and legal-page text, `site/sitemap.xml`, `site/robots.txt`, `site/llms.txt`, `redirect/*.html`) and regenerates the JSON-LD, the QR SVG and the PDF. Then add the domain on Vercel, point DNS at it, set the previous domain to redirect, update this README by hand, and push.

## Google Business Profile

`GOOGLE-BUSINESS-PROFILE.md` lists exactly what to type into a Google Business Profile (service-area listing, no address), using only facts already on the site. Creating and verifying the listing has to be done by you, signed in to your own Google account.

## Terms and privacy pages

`site/terms.html` and `site/privacy.html` are plain-English pages written to match what the site actually does today: no accounts, one optional pickup order form (name, phone, notes, kept 60 days), no visitor cookies, online orders paid up front through Square, cookieless Vercel Web Analytics, Vercel hosting logs, links to Instagram. They are a starting point, not legal advice; have someone qualified read them if the business grows.

Things to keep true:

- The contact on both pages is the Instagram account from `menu-data.js` (`LOCATION.instagram` / `LOCATION.handle`), filled in by `app.js`. If you want the phone number or an email there too, add it to the two pages by hand.
- Change the "Last updated" line at the top of a page whenever you change its text.
- The terms name Florida as governing law. Change it if the business moves.
- If the site ever gains another form, a newsletter, a cookie, a new third-party script, or ordering starts collecting more than name, phone and notes, update the privacy policy first.
- Both pages are linked from every footer, from the last scene of the home page (`links:` in `site/world/home.js`) and from `sitemap.xml`; they get the strict CSP from `vercel.json` like the other content pages.

## Replace the photos and logo

Drop full-resolution photos into `site/images/` with the same file names (`dinner-plate.jpg`, `wings-plate.jpg` are the two the menu page uses, and they also feed the home page's plate and wings scene stills and the menu social card: after replacing either, run `node make-stills.js` then `node make-images.js`, and bump the `?v=` on those two scenes' `still`/`stillSrcset` in `site/world/home.js` so browsers that cached the old still for 7 days fetch the new one; `shortrib-plate.jpg` and `shrimp-greens.jpg` are spares, not wired to anything — set `photo:` on a menu section to use one). The logo files (`logo-150.jpg`, `logo-300.png/.webp`, `logo-512.png/.webp`) are all cut from the 600px Instagram export; the home page badge uses `logo-300.webp`, the menu/QR/404 headers use `logo-512`.

The two display fonts are declared twice on purpose (`site/home.css` for the home page, `site/styles.css` for every other page) so each page loads exactly one stylesheet; keep the two `@font-face` blocks identical.
