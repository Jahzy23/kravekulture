# Krave Kulture — site, menu and QR code

Static site for the Krave Kulture food truck (Miami, FL). No build step.

## Folders

- `site/` — the website. Deploy this folder as-is.
  - `index.html` home page
  - `menu.html` menu + how to pay + find the truck (the QR code points here)
  - `menu-data.js` **the only file you edit** to change dishes, prices, payment handles, city, phone
  - `qr.html` print page for the QR card
  - `styles.css`, `app.js`, `fonts/`, `images/`
- `make-qr.js` — generates the QR code (one vector SVG card) for any URL
- `site/qr/` — generated QR files (also served on the live site at `/qr/` and shown on `/qr.html`)
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
node make-qr.js https://YOUR-SITE-URL/menu.html
```

Writes one file, `site/qr/krave-kulture-qr.svg`: the QR code on a painted Krave Kulture card, all lettering converted to vector paths. Print it at any size.

## Deploy

GitHub Actions deploys the `site/` folder to GitHub Pages on every push to `main` (live at https://jahzy23.github.io/kravekulture/). Any static host works too: upload the contents of `site/`.

## Replace the photos and logo

Drop full-resolution photos into `site/images/` with the same file names. The logo in `site/images/` came from the Instagram profile picture at 150px; replace `logo-300.png` and `logo-150.jpg` with the original artwork when you have it.
