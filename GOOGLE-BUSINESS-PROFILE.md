# Google Business Profile: what to enter

Create the listing at https://business.google.com with the Google account you want to own it. Every value below is already true on the site; nothing is invented. Leave anything you are not sure about blank rather than guessing. Google shows this listing in Maps and in the search results box, which is where most "haitian food truck miami" searches end up.

## Business

| Field | Enter |
| --- | --- |
| Business name | Krave Kulture |
| Business type | "I deliver goods and services to my customers" (service-area business). Do **not** add an address; the truck has none. |
| Service area | Miami, FL (add the neighborhoods where the truck actually parks) |
| Primary category | Food truck |
| Additional categories | Haitian restaurant · Caribbean restaurant · Soul food restaurant |
| Phone | (786) 999-4019 |
| Website | https://eatkravekulture.com |
| Menu link | https://eatkravekulture.com/menu.html |
| Hours | Leave blank until you have a fixed weekly schedule. Wrong hours get a listing marked "permanently closed" by reviewers. |
| Opening date | Whatever month the truck first served |

## Description (750 characters max; this is 463)

Krave Kulture is a Haitian, Caribbean and soul food truck in Miami. Every dinner comes with rice, meat, plantain and mac: griot (fried pork), tasso turkey, goat, shrimp, chicken, boulet (Haitian meatballs) or rib, from $20. Wings and fries in six flavors (honey hot, lemon pepper, BBQ, buffalo, jerk or plain) from $12. Banana pudding, Kravelade house lemonade, passion fruit. The truck moves around the city; today's spot is posted on Instagram @eatkravekulture.

## Attributes (tick only what is true)

- Service options: Takeout. Not dine-in, not delivery (unless you start it).
- Payments: whatever you actually take at the window.
- From the business: tick any that apply; none is stated on the site, so this is your call.

## Photos (upload from this repo, in this order)

1. Logo: `site/images/logo-512.png`
2. Cover: a real photo of the truck. There is none in this repo yet; take one at the window (whole trailer, daylight, landscape).
3. Food: `site/images/dinner-plate.jpg`, `site/images/wings-plate.jpg`, then your original food photos from Instagram.

Google prefers real photos. Do not upload the AI diorama stills (`site/world/*.webp`) or the social cards made from them (`site/images/og-home.jpg`) as business photos; they are illustrations, not your truck.

## Social links

- Instagram: https://www.instagram.com/eatkravekulture/
- TikTok: https://www.tiktok.com/@eatkravekulture1804

## Verification

Google will ask to verify by phone, video call, or a mailed postcard; for a service-area business video verification is the usual route (they ask to see the truck, the branding and a tool of the trade like the fryer). Keep the listing name exactly "Krave Kulture" so it matches the site, the card and Instagram.

## After it is live

- Post this week's spot as a Google Post ("Update") each week, same text as `SPOT` in `site/menu-data.js`.
- Answer the "Where are you today?" questions; Google surfaces Q&A on the listing.
- The site's structured data (`FoodEstablishment` with the same name, phone, website and `areaServed: Miami, FL`) already matches the listing, which helps Google tie the two together.
