# Krave Kulture — site, menu and QR code

Static site for the Krave Kulture food truck (Miami, FL). No build step.

## Folders

- `site/` — the website. Deploy this folder as-is.
  - `index.html` home page
  - `menu.html` menu + how to pay + find the truck (the QR code points here)
  - `menu-data.js` **the only file you edit** to change dishes, prices, payment handles, city, phone
  - `styles.css`, `app.js`, `fonts/`, `images/`
- `make-qr.js` — generates the QR code (vector SVG + PNG preview) for any URL
- `qr/` — generated QR files
- `tools/fonts/` — TTF copies of the display fonts used to draw text into the QR card

## Edit the menu or payments

Open `site/menu-data.js`. Change names, prices, flavors, or payment handles. Save. Redeploy.

- Replace every `FILL-IN` in `PAYMENTS` with your real Cash App, Zelle and Venmo handles.
- Delete a payment line you do not take.
- Set `phone` in `LOCATION` to show a Call button.
- Set `MENU_STATUS` to `"draft"` if you ever want a SAMPLE MENU tape across the top.

## Regenerate the QR code

```bash
npm install
node make-qr.js https://YOUR-SITE-URL/menu
```

Writes `qr/qr-menu.svg` (plain vector), `qr/qr-menu-card.svg` (print-ready branded card, all text as vector paths) and `qr/qr-menu.png` (2048px preview). Rerun whenever the URL changes, for example after you buy a domain.

## Deploy

Vercel deploys the `site/` folder automatically on every push to `main`. Any static host works too: upload the contents of `site/`.

## Replace the photos and logo

Drop full-resolution photos into `site/images/` with the same file names. The logo in `site/images/` came from the Instagram profile picture at 150px; replace `logo-300.png` and `logo-150.jpg` with the original artwork when you have it.
