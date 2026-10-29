/* Customer reviews. Only someone who placed an order can review it, once per order:
   the confirmation screen and email carry a signed link (reviewToken), and anyone else
   needs the order number plus the last 4 digits of its phone. New reviews wait for the
   truck to approve them on the admin board before they show on the menu page.
   Redis layout:
     review:<id>   JSON of one review, kept until deleted. id = <order number>-<time placed>,
                   so a recycled order number never blocks a later order's review.
     reviews       sorted set of review ids, scored by time written */
"use strict";

const crypto = require("crypto");
const { cmd } = require("./store");
const { getOrder } = require("./orders");

const STATUSES = ["pending", "approved", "hidden"];
const MAX_TEXT = 600;

const secret = () => process.env.REVIEW_SECRET || process.env.ADMIN_PASSWORD || "";
const clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
const reviewId = (order) => order.number + "-" + Date.parse(order.createdAt);

// The signed part of the review link. Empty when no secret is set (the page then asks
// for the phone digits instead).
function reviewToken(order) {
  if (!secret() || !order || !order.number || !order.createdAt) return "";
  return crypto.createHmac("sha256", "kk-review|" + secret()).update(order.number + "|" + order.createdAt).digest("base64url").slice(0, 22);
}

function sameString(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// "Marie Joseph" → "Marie J."
function shortName(name) {
  const parts = clean(name, 60).split(" ").filter(Boolean);
  if (!parts.length) return "";
  return parts[0] + (parts[1] ? " " + parts[1].charAt(0).toUpperCase() + "." : "");
}

// The order this review is for, if the visitor proved they placed it. Returns
// { order } or { error, status }.
async function proveOrder(body) {
  const number = String(body.number || "").replace(/\D/g, "");
  if (!/^\d{4,5}$/.test(number)) return { error: "Type your order number. It's on your receipt screen and in your email.", status: 400 };
  const order = await getOrder(number);
  const token = String(body.token || "");
  const last4 = String(body.last4 || "").replace(/\D/g, "");
  const tokenOk = order && token && reviewToken(order) && sameString(token, reviewToken(order));
  const phoneOk = order && last4.length === 4 && String(order.phone || "").replace(/\D/g, "").endsWith(last4);
  if (!tokenOk && !phoneOk) {
    return token && !last4
      ? { error: "That review link has expired. Type the last 4 digits of the phone you ordered with.", status: 403, needPhone: true }
      : { error: "We couldn't find that order. Check the number and the last 4 digits of your phone.", status: 404 };
  }
  return { order };
}

async function hasReview(order) {
  return Boolean(await cmd("EXISTS", "review:" + reviewId(order)));
}

// What the review page shows above the form.
function orderSummary(order) {
  return {
    number: order.number,
    name: shortName(order.name),
    items: (order.items || []).map((l) => l.qty + " × " + l.name + (l.flavor ? " (" + l.flavor + ")" : "")),
    createdAt: order.createdAt,
  };
}

function buildReview(body, order) {
  const stars = Number(body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return { error: "Tap the stars to rate your order." };
  const text = clean(body.text, MAX_TEXT);
  const name = clean(body.name, 30) || shortName(order.name);
  if (name.length < 2) return { error: "Add a name to show with your review." };
  return {
    review: {
      id: reviewId(order),
      number: order.number,
      orderedAt: order.createdAt,
      items: (order.items || []).map((l) => l.name),
      stars,
      text,
      name,
      status: "pending",
      createdAt: new Date().toISOString(),
    },
  };
}

// false if this order already has a review.
async function saveReview(review) {
  const ok = await cmd("SET", "review:" + review.id, JSON.stringify(review), "NX");
  if (ok !== "OK") return false;
  await cmd("ZADD", "reviews", Date.parse(review.createdAt), review.id);
  return true;
}

async function listReviews(limit) {
  const ids = await cmd("ZREVRANGE", "reviews", 0, (limit || 500) - 1);
  if (!ids || !ids.length) return [];
  const values = await cmd("MGET", ...ids.map((id) => "review:" + id));
  const out = [];
  values.forEach((v) => {
    if (!v) return;
    try { out.push(JSON.parse(v)); } catch (e) { /* skip a damaged entry */ }
  });
  return out;
}

async function setReviewStatus(id, status) {
  if (!STATUSES.includes(status) || !/^\d{4,5}-\d+$/.test(String(id))) return null;
  const key = "review:" + id;
  const raw = await cmd("GET", key);
  if (!raw) return null;
  const review = JSON.parse(raw);
  review.status = status;
  await cmd("SET", key, JSON.stringify(review));
  return review;
}

// What the menu page shows: approved reviews only.
async function publicReviews() {
  const approved = (await listReviews()).filter((r) => r.status === "approved");
  const count = approved.length;
  const rating = count ? Math.round((approved.reduce((s, r) => s + r.stars, 0) / count) * 10) / 10 : null;
  const reviews = approved
    .filter((r) => r.text)
    .slice(0, 6)
    .map((r) => ({ name: r.name, stars: r.stars, text: r.text, items: r.items, createdAt: r.createdAt }));
  return { rating, count, reviews };
}

module.exports = { reviewToken, proveOrder, hasReview, orderSummary, buildReview, saveReview, listReviews, setReviewStatus, publicReviews };
