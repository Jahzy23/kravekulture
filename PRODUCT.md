# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

static HTML/CSS (user's choice, 2026-09-22). Two pages: home and menu/pay. No build step. Deploy target: Vercel (no domain yet; user will add one later).

## Users

Primary: hungry walk-up customers standing at or near the Krave Kulture food trailer in Miami, FL, on a phone, often outdoors in daylight, deciding what to order and how to pay. They reach the site by scanning a QR code printed on the trailer or a table card. (Inferred from the brief; not user-confirmed.)

Secondary: Instagram followers and event organizers checking what the truck serves and where it is. (Inferred.)

## Product Purpose

A one-stop mobile page for the food trailer: the full menu with prices, the accepted payment methods, and the truck's location/contact. Success = a customer scans, reads the menu, orders, and pays without asking staff to explain anything.

## Positioning

Haitian and Caribbean soul food plus American comfort plates from one mobile trailer in Miami. Bio: "Caribbean and soul food 🇭🇹🇯🇲🇺🇸 · Mobile food service · Miami, Fl". Tagline (confirmed from Instagram bio): "Krave It. Taste It. Live the Kulture."

## Operating Context

- Business is a food truck / trailer (mobile food service). Location changes; Instagram is the live channel for where it is.
- Customers scan a QR code (vector SVG, printed) that points to the menu + payment page.
- Instagram: @eatkravekulture (202 followers as of 2026-09-22).
- Posts show: griot (fried pork) with pikliz, diri djon djon (black mushroom rice), fried plantains, macaroni au gratin, oxtail or short-rib plates over rice and peas, BBQ wings with fries and corn, sliders with waffle fries, fried shrimp with collard greens, stir fry, coleslaw.

## Capabilities and Constraints

- Static site only; no ordering, no cart, no backend.
- Menu (confirmed by the owner 2026-09-22): Plates (complete = rice, meat, plantain, mac): Griot 20, Turkey 20, Goat 25, Shrimp 22, Chicken 20, Boulet 20, Rib 20. Sides: Mac 6, Rice 5. Wings with fries: 6 pc 12, 8 pc 14, 10 pc 16; flavors Honey Hot, Lemon Pepper, BBQ, Buffalo. Dessert: Banana Pudding 6. Drinks: Soda 1, Water 1, Kravelade 5, Passion Fruit 5. Source of truth in site/menu-data.js.
- Payment methods: user deferred ("ill do this later"). Ship a payment section with labeled placeholder slots (handle, phone) that the user fills in.
- QR code target: Vercel URL until a domain exists. Regenerate script included.
- Must read well on a phone in bright outdoor light.

## Brand Commitments

- Name: Krave Kulture (Instagram display name "EatKraveKulture").
- Logo (confirmed asset, from Instagram profile picture, 150px only): circular badge, black ground, Miami skyline at sunset in gold/orange, palm trees, the food trailer with Haitian flag and US flag, "KRAVE KULTURE" in chrome/gold metallic lettering with a flame in the A, crossed fork and knife at the bottom, thin red/blue ring. Source: brand/logo-ig-150.jpg. Higher-resolution logo must come from the user.
- Palette sampled from the logo: black, gold/orange sunset, chrome silver, Haitian flag blue and red.
- Flags: Haitian, Jamaican, and US flags appear in the bio; Haitian and US on the logo.

## Evidence on Hand

- brand/logo-ig-150.jpg (profile picture, 150x150).
- brand/post-*.jpg: seven food photos pulled from the public Instagram grid (640px). Usable as reference; user should supply originals for print/web quality.
- No testimonials, reviews, press, or hours confirmed. Do not fabricate.

## Product Principles

1. Scan-to-order speed: the menu is the first thing a phone shows, prices visible without tapping.
2. Everything a customer needs to pay is on one page.
3. Real food photos over illustration; the plates are the proof.
4. Editable by the owner: one data block for menu items, one for payment handles.
