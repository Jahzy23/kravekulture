/* /api/reviews — the truck's Google rating and a few recent good reviews, for the
   Reviews section on the menu page.
   GET → { rating, count, url, reviews: [{ name, stars, text, when }] }
   Needs GOOGLE_PLACES_API_KEY in Vercel and REVIEWS.placeId in menu-data.js. Without
   them it answers { rating: null, reviews: [] } and the page shows only the links.
   Answers are cached (here and on Vercel's CDN) for 6 hours so Google is asked a few
   times a day at most. */
"use strict";

const { send } = require("./_lib/http");
const { REVIEWS } = require("../menu-data.js");

const KEY = process.env.GOOGLE_PLACES_API_KEY || "";
const TTL = 6 * 3600 * 1000;
const EMPTY = { rating: null, count: 0, url: "", reviews: [] };

let cache = null; // { at, data }

async function fromGoogle(placeId) {
  const res = await fetch("https://places.googleapis.com/v1/places/" + encodeURIComponent(placeId), {
    headers: {
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews",
    },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error("Google said " + res.status + " " + (await res.text().catch(() => "")).slice(0, 200));
  const p = await res.json();
  const reviews = (p.reviews || [])
    .filter((r) => r.rating >= 4 && r.text && r.text.text)
    .slice(0, 3)
    .map((r) => ({
      name: (r.authorAttribution && r.authorAttribution.displayName) || "Google user",
      stars: r.rating,
      text: r.text.text.length > 320 ? r.text.text.slice(0, 317).trimEnd() + "…" : r.text.text,
      when: r.relativePublishTimeDescription || "",
    }));
  return { rating: p.rating || null, count: p.userRatingCount || 0, url: p.googleMapsUri || "", reviews };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return send(res, 405, { error: "Method not allowed" });
  }
  const placeId = (REVIEWS && REVIEWS.placeId) || "";
  if (!KEY || !placeId) return send(res, 200, EMPTY);

  if (!cache || Date.now() - cache.at > TTL) {
    try {
      cache = { at: Date.now(), data: await fromGoogle(placeId) };
    } catch (e) {
      console.error("[reviews]", e && e.message);
      // Keep showing the last good answer; try Google again in 10 minutes.
      if (cache) cache.at = Date.now() - TTL + 600000;
      else return send(res, 200, EMPTY);
    }
  }
  res.setHeader("Vercel-CDN-Cache-Control", "max-age=21600, stale-while-revalidate=86400");
  return send(res, 200, cache.data);
};
